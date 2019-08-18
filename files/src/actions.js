'use strict';

const Action = {
    select(element) {
        if (element instanceof Element == false) return;
        cs.selected_elements.add(element);
    },
    deselect(element) {
        if (element instanceof Element == false) return;
        cs.selected_elements.delete(element);
    },

    move(element, vec, snap_size) {
        element.move(vec, snap_size);
    },

    add(element) {
        if (element instanceof Element == false) return;

        element.assign_id();

        if (element instanceof Gate) {
            for (const node of element.nodes()) {
                node.assign_id();
            }
            for (const node of element.outputs) {
                for (const wire_segment of node.wire_segments) {
                    wire_segment.assign_id();
                }
            }

            cs.context.inner_elements.push(element);
        }

        if (element instanceof Label) {
            cs.context.inner_elements.push(element);
        }
    },
    remove(element) {
        if (element instanceof Element == false) return;

        Action.deselect(element);

        if (element instanceof ConnectionNode) {
            if (element.parent() && element.parent().allow_new_input_nodes()) {
                element.parent().remove_input_node(element);
            }
        }
        else if (element instanceof Gate) {
            for (const node of element.nodes()) {
                Action.clear_node(node);
            }

            cs.context.inner_elements.remove(element);
        }
        else if (element instanceof Label) {
            cs.context.inner_elements.remove(element);
        }
        else if (element instanceof WireSegment) {
            const parent_node = element.parent();
            if (!parent_node) return;

            const root_segment = parent_node.attached_wire_segment();

            for (const segment of parent_node.wire_segments) {
                segment.depth = -1;
            }

            const queue = new Set([root_segment]);
            let current_depth = 0;

            while (queue.size) {
                const current_queue = Array.from(queue);
                queue.clear();

                for (const segment of current_queue) {
                    segment.depth = current_depth;

                    for (const neighbor of segment.neighbor_segments) {
                        if (neighbor.depth < 0) {
                            queue.add(neighbor);
                        }
                    }
                }

                current_depth++;
            }


            const queue_remove = new Set([element]);

            while (queue_remove.size) {
                const current_queue = Array.from(queue_remove);
                queue_remove.clear();

                for (const segment of current_queue) {
                    const attached_node = segment.attached_connection_node();
                    if (attached_node) {
                        attached_node.clear();
                    }

                    parent_node.wire_segments.remove(segment);

                    for (const neighbor of segment.neighbor_segments.copy()) {
                        Util.detach_segments(segment, neighbor);

                        if (neighbor.depth > segment.depth || neighbor.neighbor_elements().length == 1) {
                            queue_remove.add(neighbor);
                        }
                    }
                }
            }
        }
    },

    tick() {
        const result = {visible_node_changed:false, visible_node_queued:false};

        const next_ticked_nodes = new Set;

        for (const gate of cs.context.inner_elements) {
            if (gate instanceof Clock) {
                for (const node of gate.outputs) {
                    next_ticked_nodes.add(node);
                }
            }
        }

        for (const node of cs.ticked_nodes) {
            const eval_node_state = node.eval_state();

            if (node.is_rising_edge && node.rising_edge_ticks_active <= node.rising_edge_pulse_length) {
                next_ticked_nodes.add(node);
            }
            if (node.parent() instanceof InputPulse && node.parent().pulse_ticks_ <= node.parent().pulse_length) {
                next_ticked_nodes.add(node);
            }

            if (eval_node_state == node.state) {
                continue;
            }

            if (!cs.controller.tick_nodes) {
                result.visible_node_changed = result.visible_node_changed ||
                    ActionUtil.elements().includes(node.parent());
            }

            node.state = eval_node_state;

            const parent = node.parent();
            if (node.next_nodes || parent) {
                for (const next_node of node.next_nodes||parent.outputs) {
                    if (!cs.controller.tick_nodes) {
                        result.visible_node_queued = result.visible_node_queued ||
                            ActionUtil.elements().includes(next_node.parent());
                    }

                    next_ticked_nodes.add(next_node);
                }
            }
        }

        cs.ticked_nodes = next_ticked_nodes;

        return result;
    },
    update(skip_animations=false) {
        for (const element of ActionUtil.elements().sorted(Util.compare_function(x=>x.update_priority_)).reverse()) {
            element.update(skip_animations);
        }
    },
    queue_tick(node) {
        if (node instanceof ConnectionNode == false) return;
        cs.ticked_nodes.add(node);
    },

    update_last_pos(element) {
        if (element instanceof Element == false) return;
        if (!element.update_last_pos) return;
        element.update_last_pos();
    },
    update_last_size(element) {
        if (element instanceof Element == false) return;
        if (!element.update_last_size) return;
        element.update_last_size();
    },

    connect_nodes(start_node, end_node) {
        if (ActionUtil.nodes_connectable(start_node, end_node) == false) return;

        const input_node = start_node instanceof InputNode ? start_node : end_node;
        const output_node = start_node instanceof OutputNode ? start_node : end_node;

        Action.clear_node(input_node);

        output_node.next_nodes.push(input_node);

        Action.queue_tick(input_node);
    },
    invert_node(node) {
        if (node instanceof ConnectionNode == false) return;
        node.invert();
    },
    clear_node(node) {
        if (node instanceof ConnectionNode == false) return;
        if (node.is_empty()) return;
        Action.remove(node.attached_wire_segment());
    },

    add_input_node(gate) {
        if (gate instanceof Gate == false) return;

        if (gate.allow_new_input_nodes()) {
            gate.add_input_node();
        }
    },
    remove_input_node(gate) {
        if (gate instanceof Gate == false) return;

        if (gate.allow_new_input_nodes()) {
            Action.remove(gate.inputs.copy().reverse().find(node => node.is_empty()));
        }
    },

    split_segment(segment) {
        if (segment instanceof WireSegment == false) return;

        const prev_segment = new WireSegment;
        prev_segment.is_vertical = segment.is_vertical;

        const next_segment = new WireSegment;
        next_segment.is_vertical = segment.is_vertical;

        const neighbor_elements = segment.neighbor_elements();

        const neighbors = neighbor_elements.sorted(Util.compare_function(x=>x.offset));
        const prev_neighbor = neighbors[0];
        const next_neighbor = neighbors.last();

        Util.attach_segments(prev_segment, segment);
        Util.attach_segments(next_segment, segment);

        for (const neighbor of neighbor_elements) {
            Util.detach_segments(segment, neighbor.element);
        }

        prev_segment.anim_offset_ = segment.anim_offset_;
        next_segment.anim_offset_ = segment.anim_offset_;
        prev_segment.offset = segment.offset - segment.snap_size_;
        next_segment.offset = segment.offset + segment.snap_size_;

        segment.offset = segment.anim_offset_ = Util.round(prev_neighbor.offset/2 + next_neighbor.offset/2, segment.snap_size_);

        for (const neighbor of neighbor_elements) {
            Util.attach_segments(neighbor.offset > segment.offset ? prev_segment : next_segment, neighbor.element);
        }

        segment.is_vertical = !segment.is_vertical;
        segment.parent().wire_segments.push(prev_segment);
        segment.parent().wire_segments.push(next_segment);

        Action.restructure_segments();
    },

    create_wire(new_wire_segments, start_element, end_element, dragging_wire=false) {
        if (ActionUtil.nodes_connectable(start_element, end_element)) {
            Action.connect_nodes(start_element, end_element);

            if (new_wire_segments.last().is_vertical != end_element.is_vertical() && new_wire_segments.length > 2) {
                Util.remove_segment(new_wire_segments);
            }

            const output_node = start_element instanceof OutputNode ? start_element : end_element;

            output_node.wire_segments.push(...new_wire_segments);
            new_wire_segments.last().set_connected_pos(end_element.anchor_pos_);

            return true;
        }
        else if (end_element instanceof WireSegment) {
            if (start_element instanceof OutputNode) return false;
            if (end_element.parent().next_nodes.includes(start_element)) return false;

            new_wire_segments.last().normal_pos = null;

            if (dragging_wire) {
                new_wire_segments.at(-2).offset_pos = new_wire_segments.at(-1).offset_pos;
                Util.remove_segment(new_wire_segments);
            }

            if (new_wire_segments.last().is_vertical == end_element.is_vertical) {
                Util.remove_segment(new_wire_segments);
            }

            end_element.parent().wire_segments.push(...new_wire_segments);

            Util.attach_segments(new_wire_segments.last(), end_element);

            Action.connect_nodes(end_element.parent(), start_element);

            if (start_element instanceof OutputNode) {
                const start_segment = end_element.parent().wire_segments.find(segment => segment.is_connected_to(end_element.parent()));
                Action.remove(start_segment);

                start_element.next_nodes = [];
            }

            return true;
        }

        return false;
    },

    restructure_segments() {
        let segments;

        do {
            segments = ActionUtil.elements().filter(element => element instanceof WireSegment);
        }
        while(
            Action.merge_segments             (segments) ||
            Action.center_invisible_segment   (segments) ||
            Action.merge_segments_same_output (segments) ||
            Action.fix_sharp_corners          (segments)
        );
    },

    merge_segments(segments) {
        for (const segment of segments) {
            const offset_to_neighbors = new Map;

            for (const neighbor of segment.neighbor_segments) {
                if (!offset_to_neighbors.has(neighbor.offset)) {
                    offset_to_neighbors.set(neighbor.offset, [neighbor]);
                }
                else {
                    offset_to_neighbors.get(neighbor.offset).push(neighbor);
                }
            }

            const remove_segment = offset_to_neighbors.size==1 && !segment.offset_pos;

            for (const [offset, neighbors] of offset_to_neighbors) {
                if (neighbors.length <= 1) {
                    continue;
                }

                const output_node = segment.parent();
                const joined_segment = new WireSegment;
                joined_segment.is_vertical = !segment.is_vertical;
                joined_segment.offset = offset;
                joined_segment.update(true);

                joined_segment.anim_color_.anim_hsva(cs.theme.merge_segment_flash).anim_factor(cs.config.fade_color_anim_factor);

                let would_be_single_segment_wire = false;
                let has_node = false;

                for (const replaced_neighbor of neighbors) {
                    if (replaced_neighbor.offset_pos) {
                        if (has_node) {
                            would_be_single_segment_wire = true;
                            break;
                        }

                        joined_segment.set_connected_pos(replaced_neighbor.offset_pos);
                        has_node = true;
                    }
                }

                if (would_be_single_segment_wire) {
                    continue;
                }

                for (const replaced_neighbor of neighbors) {
                    for (const extended_neighbor of replaced_neighbor.neighbor_segments) {
                        if (extended_neighbor == segment) {
                            continue;
                        }

                        const index = extended_neighbor.neighbor_segments.indexOf(replaced_neighbor);
                        extended_neighbor.neighbor_segments[index] = joined_segment;
                        joined_segment.neighbor_segments.push(extended_neighbor);
                    }

                    output_node.wire_segments.remove(replaced_neighbor);
                    segment.neighbor_segments.remove(replaced_neighbor);
                }

                output_node.wire_segments.push(joined_segment);

                if (remove_segment) {
                    output_node.wire_segments.remove(segment);
                }
                else {
                    Util.attach_segments(segment, joined_segment);
                }

                return true;
            }
        }
    },
    center_invisible_segment(segments) {
        for (const segment of segments) {
            if (segment.neighbor_segments.length != 2) {
                continue;
            }

            const neighbor_a = segment.neighbor_segments[0];
            const neighbor_b = segment.neighbor_segments[1];

            if (neighbor_a.offset != neighbor_b.offset) {
                continue;
            }

            const offset_pos_a = neighbor_a.offset_pos;
            const offset_pos_b = neighbor_b.offset_pos;

            if (!offset_pos_a || !offset_pos_b) {
                continue;
            }

            const offset_a = neighbor_a.is_vertical ? offset_pos_a.y : offset_pos_a.x;
            const offset_b = neighbor_b.is_vertical ? offset_pos_b.y : offset_pos_b.x;
            segment.offset = (offset_a + offset_b) / 2;
        }
    },

    merge_segments_same_output(segments) {
        for (const segment of segments) {
            const attached_node = segment.attached_connection_node();

            if (attached_node instanceof OutputNode == false) {
                continue;
            }

            const attached_segment = attached_node.attached_wire_segment();

            if (segment == attached_segment) {
                continue;
            }

            Util.detach_segments(segment, attached_node);

            for (const neighbor of segment.neighbor_segments) {
                Util.detach_segments(neighbor, segment);
                Util.attach_segments(neighbor, attached_segment);
            }

            return true;
        }
    },
    fix_sharp_corners(segments) {
        for (const segment of segments) {
            const attached_node = segment.attached_connection_node();

            if (!attached_node) {
                continue;
            }
            if (segment.is_vertical == attached_node.is_vertical()) {
                continue;
            }

            const new_segment = new WireSegment;
            new_segment.is_vertical = attached_node.is_vertical();

            Util.detach_segments(segment, attached_node);

            Util.attach_segments(new_segment, segment);
            Util.attach_segments(new_segment, attached_node);

            segment.parent().wire_segments.push(new_segment);

            new_segment.update(true);

            return true;
        }
    },
};

const ActionUtil = {
    select_all() {
        for (const element of ActionUtil.elements()) {
            Action.select(element);
        }
    },
    deselect_all() {
        for (const element of ActionUtil.elements()) {
            Action.deselect(element);
        }
    },
    set_selected(element, is_selected) {
        if (is_selected) {
            Action.select(element);
        }
        else {
            Action.deselect(element);
        }
    },

    tick_until_change() {
        let i = 0;
        let result;

        while (i++ < cs.config.max_ticks_without_change) {
            result = Action.tick();
            if (result.visible_node_changed) {
                break;
            }
        }

        while (i++ < cs.config.max_ticks_without_change) {
            if (result.visible_node_queued) {
                break;
            }
            result = Action.tick();
        }
    },
    queue_tick_for(elements) {
        for (const element of elements) {
            Action.queue_tick(element);
        }
    },
    queue_tick_all() {
        ActionUtil.queue_tick_for(ActionUtil.all_elements());
    },

    move_elements(elements, vec) {
        const snap_size = Math.max(...elements.map(element => element.snap_size_));

        for (const element of elements) {
            Action.move(element, vec, snap_size);
        }

        return snap_size;
    },
    move_selected(vec) {
        ActionUtil.move_elements(ActionUtil.selected_elements());
    },
    remove_soft(elements) {
        return !elements.some(element => element instanceof Gate || element instanceof Label)
            && elements.some(element => element instanceof ConnectionNode && !element.is_empty());
    },
    remove_all(elements) {
        if (ActionUtil.remove_soft()) {
            for (const element of elements) {
                Action.clear_node(element);
            }
        }
        else {
            for (const element of elements) {
                Action.remove(element);
            }
        }
    },
    remove_selected() {
        ActionUtil.remove_all(ActionUtil.selected_elements());
    },

    update_all_last_pos(elements=ActionUtil.elements()) {
        for (const element of elements) {
            Action.update_last_pos(element);
        }
    },
    update_all_last_size(elements=ActionUtil.elements()) {
        for (const element of elements) {
            Action.update_last_size(element);
        }
    },

    split_selected_segments() {
        for (const element of ActionUtil.selected_elements()) {
            Action.split_segment(element);
        }
    },
    clear_selected_nodes() {
        for (const element of ActionUtil.selected_elements()) {
            Action.clear_node(element);
        }
    },
    invert_selected_nodes() {
        for (const element of ActionUtil.selected_elements()) {
            Action.invert_node(element);
        }
    },

    add_input_node_to_selected() {
        for (const element of ActionUtil.selected_elements()) {
            Action.add_input_node(element);
        }
    },

    remove_input_node_from_selected() {
        for (const element of ActionUtil.selected_elements()) {
            Action.remove_input_node(element);
        }
    },

    element_at(pos, filter=null) {
        let nearest_element = null;
        let min_dist = Infinity;

        for (const element of ActionUtil.elements()) {
            if (!filter || filter(element)) {
                const dist = element.distance(pos);

                if (dist < min_dist) {
                    min_dist = dist;
                    nearest_element = element;
                }
            }
        }

        return nearest_element;
    },
    elements_in_rect(pos, size, elements=ActionUtil.elements()) {
        const elements_in_rect = [];

        for (const element of elements) {
            const rect = element.hitbox_rect();

            if (Util.rects_overlap(rect.pos, rect.size, pos, size)) {
                elements_in_rect.push(element);
            }
        }

        return elements_in_rect;
    },

    all_inner_elements(custom_gate) {
        return [
            ...ActionUtil.elements(custom_gate.inner_elements),
            ...custom_gate.inner_elements
                .filter(element => element instanceof CustomGate)
                .flatMap(custom_gate => ActionUtil.all_inner_elements(custom_gate)),
        ];
    },

    nodes_connectable(start_node, end_node) {
        return start_node instanceof ConnectionNode
            && end_node instanceof ConnectionNode
            && (start_node instanceof OutputNode) != (end_node instanceof OutputNode);
    },

    elements_connectable(start_element, end_element) {
        return ActionUtil.nodes_connectable(start_element, end_element)
            || start_element instanceof InputNode
            && end_element instanceof WireSegment
            && !cs.controller.new_wire_segments.includes(end_element);
    },

    all_elements() {
        return ActionUtil.all_inner_elements(cs.context);
    },
    elements(element_list=cs.context.inner_elements) {
        const elements = [];

        for (const element of element_list) {
            elements.push(element);

            if (element instanceof Gate) {
                elements.push(...element.inputs);
                elements.push(...element.outputs);

                for (const node of element.outputs) {
                    elements.push(...node.wire_segments);
                }
            }
        }

        return elements;
    },
    selected_elements() {
        return Array.from(cs.selected_elements);
    },
};
