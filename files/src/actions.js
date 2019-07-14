'use strict';

const Action = {
    select: function(element) {
        if (element instanceof Element == false) return;
        cs.selected_elements.add(element);
    },
    deselect: function(element) {
        if (element instanceof Element == false) return;
        cs.selected_elements.delete(element);
    },

    move: function(element, vec, snap_size) {
        element.move(vec, snap_size);
    },

    add: function(element) {
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
    remove: function(element) {
        if (element instanceof Element == false) return;

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
        else if (element instanceof WireSegment) {
            const parent_node = element.parent();
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

        Action.deselect(element);
    },

    tick: function() {
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

            node.state = eval_node_state;

            for (const next_node of node.next_nodes||node.parent().outputs) {
                next_ticked_nodes.add(next_node);
            }
        }

        cs.ticked_nodes = next_ticked_nodes;
    },
    update: function() {
        for (const element of ActionGet.elements().sorted((a,b) => b.update_priority_-a.update_priority_)) {
            element.update();
        }
    },
    queue_tick: function(node) {
        if (node instanceof ConnectionNode == false) return;
        cs.ticked_nodes.add(node);
    },

    update_last_pos: function(element) {
        if (element instanceof Element == false) return;
        if (!element.update_last_pos) return;
        element.update_last_pos();
    },

    connect_nodes: function(start_node, end_node) {
        if (ActionGet.nodes_connectable(start_node, end_node) == false) return;

        const input_node = start_node instanceof InputNode ? start_node : end_node;
        const output_node = start_node instanceof OutputNode ? start_node : end_node;

        Action.clear_node(input_node);

        output_node.next_nodes.push(input_node);

        Action.queue_tick(input_node);
    },
    invert_node: function(node) {
        if (node instanceof ConnectionNode == false) return;
        node.invert();
    },
    clear_node: function(node) {
        if (node instanceof ConnectionNode == false) return;
        if (node.is_empty()) return;
        Action.remove(node.attached_wire_segment());
    },

    add_input_node: function(gate) {
        if (gate instanceof Gate == false) return;

        if (gate.allow_new_input_nodes()) {
            const node = gate.add_input_node();

            // node.cancel_animation();
            // node.anim_pos_.add(node.dir);
            // node.color_line_.set_anim_hsva(cs.theme.node_init);
        }
    },
    remove_input_node: function(gate) {
        if (gate instanceof Gate == false) return;

        if (gate.allow_new_input_nodes()) {
            Action.remove(gate.inputs.copy().reverse().find(node => node.is_empty()));
        }
    },

    split_segment: function(segment) {
        if (segment instanceof WireSegment == false) return;

        const is_vertical = segment.is_vertical;
        const prev_segment = new WireSegment;
        prev_segment.is_vertical = is_vertical;

        const next_segment = new WireSegment;
        next_segment.is_vertical = is_vertical;

        const prev_neighbor = segment.neighbor_segments[0];
        const next_neighbor = segment.neighbor_segments[1];

        Util.detach_segments(prev_neighbor, segment);
        Util.detach_segments(next_neighbor, segment);

        Util.attach_segments(prev_segment, prev_neighbor);
        Util.attach_segments(prev_segment, segment);
        Util.attach_segments(next_segment, segment);
        Util.attach_segments(next_segment, next_neighbor);

        segment.is_vertical = !is_vertical;

        segment.parent().wire_segments.push(prev_segment);
        segment.parent().wire_segments.push(next_segment);

        prev_segment.offset = segment.offset - segment.snap_size_;
        next_segment.offset = segment.offset + segment.snap_size_;

        prev_segment.anim_offset_ = segment.anim_offset_;
        next_segment.anim_offset_ = segment.anim_offset_;

        segment.offset = segment.anim_offset_ = prev_neighbor.offset/2 + next_neighbor.offset/2;
    },

    create_wire: function(new_wire_segments, start_element, end_element, dragging_wire=false) {
        if (ActionGet.nodes_connectable(start_element, end_element)) {
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
            // TEMP
            // if (start_element instanceof OutputNode) return false;
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

    restructure_segments: function () {
        Action.merge_segments();
        Action.center_invisible_segment_step();
    },

    merge_segments: function () {
        const segments = ActionGet.elements().filter(element => element instanceof WireSegment);
        for (const segment of segments) {
            const offset_to_neighbors = new Map();
            for (const neighbor of segment.neighbor_segments) {
                const is_in = offset_to_neighbors.has(neighbor.offset);
                if (!is_in) {
                    offset_to_neighbors.set(neighbor.offset, [neighbor]);
                } else {
                    offset_to_neighbors.get(neighbor.offset).push(neighbor);
                }
            }
            const remove_segment = offset_to_neighbors.size === 1 && segment.offset_pos === null;
            for (const [offset, neighbors] of offset_to_neighbors) {
                if (neighbors.length <= 1) continue;
                const output_node = segment.parent();
                const joined_segment = new WireSegment();
                joined_segment.is_vertical = !segment.is_vertical;
                joined_segment.offset = offset;
                joined_segment.cancel_animation();
                var would_be_single_segment_wire = false;
                var has_node = false;
                for (const replaced_neighbor of neighbors) {
                    if (replaced_neighbor.offset_pos !== null) {
                        if (has_node) {
                            would_be_single_segment_wire = true;
                            break;
                        }
                        joined_segment.set_connected_pos(replaced_neighbor.offset_pos);
                        has_node = true;
                    }
                }
                if (would_be_single_segment_wire) continue;
                for (const replaced_neighbor of neighbors) {
                    for (const extended_neighbor of replaced_neighbor.neighbor_segments) {
                        if (extended_neighbor === segment) continue;
                        const i = extended_neighbor.neighbor_segments.indexOf(replaced_neighbor);
                        extended_neighbor.neighbor_segments[i] = joined_segment;
                        joined_segment.neighbor_segments.push(extended_neighbor);
                    }
                    output_node.wire_segments.remove(replaced_neighbor);
                    segment.neighbor_segments.remove(replaced_neighbor);
                }
                output_node.wire_segments.push(joined_segment);
                if (remove_segment) {
                    output_node.wire_segments.remove(segment);
                } else {
                    joined_segment.neighbor_segments.push(segment);
                    segment.neighbor_segments.push(joined_segment);
                }
            }
        }
    },
    center_invisible_segment_step: function (segments) {
        for (const segment of segments) {
            if (segment.neighbor_segments.length !== 2) continue;
            const neighbor0 = segment.neighbor_segments[0];
            const neighbor1 = segment.neighbor_segments[1];
            if (neighbor0.offset !== neighbor1.offset) continue;
            const offset_pos0 = neighbor0.offset_pos;
            const offset_pos1 = neighbor1.offset_pos;
            if (offset_pos0 === null || offset_pos1 === null) continue;
            const offset0 = neighbor0.is_vertical ? offset_pos0.y : offset_pos0.x;
            const offset1 = neighbor1.is_vertical ? offset_pos1.y : offset_pos1.x;
            segment.offset = (offset0 + offset1) / 2;
        }
    },
};

const ActionUtil = {
    select_all: function() {
        for (const element of ActionGet.elements()) {
            Action.select(element);
        }
    },
    deselect_all: function() {
        for (const element of ActionGet.elements()) {
            Action.deselect(element);
        }

        // TEMP
        cs.selected_elements = new Set;
    },
    set_selected: function(element, is_selected) {
        if (is_selected) {
            Action.select(element);
        }
        else {
            Action.deselect(element);
        }
    },

    queue_tick_all: function() {
        for (const element of ActionGet.elements()) {
            Action.queue_tick(element);
        }
    },

    move_elements: function(elements, vec) {
        const snap_size = Math.max(...elements.map(element => element.snap_size_));

        for (const element of elements) {
            Action.move(element, vec, snap_size);
        }

        return snap_size;
    },
    move_selected: function(vec) {
        ActionUtil.move_elements(ActionGet.selected_elements());
    },
    remove_selected: function() {
        const selected_elements = ActionGet.selected_elements();

        const soft =
            !selected_elements.some(element => element instanceof Gate || element instanceof Label)
            && selected_elements.some(element => element instanceof ConnectionNode && !element.is_empty());

        if (soft) {
            for (const element of selected_elements) {
                Action.clear_node(element);
            }
        }
        else {
            for (const element of selected_elements) {
                Action.remove(element);
            }
        }
    },

    update_all_last_pos: function(elements=ActionGet.elements()) {
        for (const element of elements) {
            Action.update_last_pos(element);
        }
    },

    split_selected_segments: function() {
        for (const element of ActionGet.selected_elements()) {
            Action.split_segment(element);
        }
    },
    clear_selected_nodes: function() {
        for (const element of ActionGet.selected_elements()) {
            Action.clear_node(element);
        }
    },
    invert_selected_nodes: function() {
        for (const element of ActionGet.selected_elements()) {
            Action.invert_node(element);
        }
    },

    add_input_node_to_selected: function() {
        for (const element of ActionGet.selected_elements()) {
            Action.add_input_node(element);
        }
    },

    remove_input_node_from_selected: function() {
        for (const element of ActionGet.selected_elements()) {
            Action.remove_input_node(element);
        }
    },
};

const ActionGet = {
    element_at: function(pos, filter=null) {
        let nearest_element = null;
        let min_dist = Infinity;

        for (const element of ActionGet.elements()) {
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
    elements_in_rect: function(pos, size) {
        const elements_in_rect = [];

        for (const element of ActionGet.elements()) {
            const rect = element.hitbox_rect();

            if (Util.rects_overlap(rect.pos, rect.size, pos, size)) {
                elements_in_rect.push(element);
            }
        }

        return elements_in_rect;
    },

    all_inner_elements: function(custom_gate) {
        return [
            ...ActionGet.elements(custom_gate.inner_elements),
            ...custom_gate.inner_elements
                .filter(element => element instanceof CustomGate)
                .flatMap(custom_gate => ActionGet.all_inner_elements(custom_gate)),
        ];
    },

    nodes_connectable: function(start_node, end_node) {
        return start_node instanceof ConnectionNode
            && end_node instanceof ConnectionNode
            && (start_node instanceof OutputNode) != (end_node instanceof OutputNode);
    },

    all_elements: function() {
        return ActionGet.all_inner_elements(cs.context);
    },
    elements: function(element_list=cs.context.inner_elements) {
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
    selected_elements: function() {
        return Array.from(cs.selected_elements);
    },
};
