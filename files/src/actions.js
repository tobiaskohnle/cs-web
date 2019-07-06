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
        }
        else if (element instanceof WireSegment) {
            const remove_segments_queue = new Set([element]);

            while (remove_segments_queue.size) {
                const remove_segments_array = Array.from(remove_segments_queue);
                remove_segments_queue.clear();

                for (const element of remove_segments_array) {
                    const parent = element.parent();

                    parent.wire_segments.remove(element);

                    if (element.is_connected_to(parent)) {
                        parent.clear();
                    }

                    const input_node = parent.next_nodes.find(node => element.is_connected_to(node));
                    if (input_node) {
                        input_node.clear();
                    }

                    const neighbor_segments = element.neighbor_segments.copy();

                    for (const neighbor_segment of neighbor_segments) {
                        Util.detach_segments(element, neighbor_segment);
                    }

                    for (const neighbor_segment of neighbor_segments) {
                        if (neighbor_segment.neighbor_elements().length == 1) {
                            remove_segments_queue.add(neighbor_segment);
                        }
                    }
                }
            }
        }

        Action.deselect(element);

        cs.context.inner_elements.remove(element);
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
            gate.add_input_node();
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

    create_wire: function(new_wire_segments, start_element, end_element) {
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
            if (start_element instanceof OutputNode) return false;
            if (end_element.parent().next_nodes.includes(start_element)) return false;

            new_wire_segments.last().normal_pos = null;

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

    restructure_segments: function() {},
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

        const soft = selected_elements.some(
            element => element instanceof ConnectionNode && !element.is_empty()
        );

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

    nodes_connectable: function(start_node, end_node) {
        return start_node instanceof ConnectionNode
            && end_node instanceof ConnectionNode
            && (start_node instanceof OutputNode) != (end_node instanceof OutputNode);
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
