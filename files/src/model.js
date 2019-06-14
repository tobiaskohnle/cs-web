'use strict';

class Model {
    constructor() {
        this.ticked_nodes_ = new Set;
        this.selected_elements_ = new Set;

        this.main_gate = new CustomGate;
    }

    tick() {
        const next_ticked_nodes = new Set;

        for (const node of this.ticked_nodes_) {
            const eval_node_state = node.eval_state();

            if (node.is_rising_edge && node.rising_edge_ticks_active <= node.rising_edge_pulse_length) {
                next_ticked_nodes.add(node);
            }

            if (eval_node_state == node.state) {
                continue;
            }

            node.state = eval_node_state;

            for (const next_node of node.next_nodes||node.parent.outputs) {
                next_ticked_nodes.add(next_node);
            }
        }

        this.ticked_nodes_ = next_ticked_nodes;
    }

    tick_all() {
        for (const element of this.elements()) {
            if (element instanceof ConnectionNode) {
                this.queue_tick(element);
            }
        }
    }

    update() {
        for (const element of this.elements().sorted((a,b) => b.update_priority_-a.update_priority_)) {
            element.update();
        }

        // TEMP
        for (const segment of current_tab.controller.new_wire_segments) {
            segment.update();
        }
        // /TEMP
    }

    // TEMP
    selected_elements_array() {
        return Array.from(this.selected_elements_);
    }
    selected_element() {
        return this.selected_elements_array()[0] || null;
    }
    // /TEMP

    elements() {
        const elements = [];

        for (const element of this.main_gate.inner_elements) {
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
    }

    queue_tick(node) {
        this.ticked_nodes_.add(node);
    }

    update_all_last_pos() {
        for (const element of this.elements()) {
            if (element.update_last_pos) {
                element.update_last_pos();
            }
        }
    }

    element_at(pos, filter=null) {
        let nearest_element = null;
        let min_dist = Infinity;

        for (const element of this.elements()) {
            if (!filter || filter(element)) {
                const dist = element.distance(pos);

                if (dist < min_dist) {
                    min_dist = dist;
                    nearest_element = element;
                }
            }
        }

        return nearest_element;
    }

    add_input_node_to_selected_gates() {
        for (const element of this.selected_elements_) {
            if (element instanceof Gate) {
                const node = element.add_input_node();

                element.set_nodes_pos();
                node.cancel_animation();
                node.anim_pos_.add(node.dir);
                node.color_line_.set_anim_hsva(new Color(.5,0,0,.1));
            }
        }
    }

    move_elements(elements, vec, total_vec) {
        const snap_size = Math.max(...elements.map(element => element.snap_size_));

        for (const element of elements) {
            element.move(vec, total_vec, snap_size);
        }

        return snap_size;
    }

    invert_selected_connection_nodes() {
        for (const element of this.selected_elements_) {
            if (element instanceof ConnectionNode) {
                element.invert();
            }
        }
    }

    set_selected(element, is_selected) {
        if (element == null) {
            return;
        }

        if (is_selected) {
            this.selected_elements_.add(element);
        }
        else {
            this.selected_elements_.delete(element);
        }
    }

    select(element) {
        if (element == null) {
            return;
        }

        this.selected_elements_.add(element);
    }

    select_all() {
        for (const element of this.elements()) {
            this.selected_elements_.add(element);
        }
    }

    deselect(element) {
        if (element == null) {
            return;
        }

        this.selected_elements_.delete(element);
    }

    deselect_all() {
        this.selected_elements_ = new Set;
    }

    add(element) {
        if (element == null) {
            return;
        }

        if (!(element instanceof Gate || element instanceof Label)) {
            return;
        }

        this.main_gate.inner_elements.push(element);
    }

    delete_selected_elements() {
        for (const element of this.selected_elements_) {
            this.delete(element);
        }

        this.deselect_all();
    }

    delete(element) {
        if (element == null) {
            return;
        }

        if (element instanceof ConnectionNode) {
            element.clear();
        }

        if (element instanceof Gate) {
            element.clear_nodes();
        }

        this.deselect(element);

        this.main_gate.inner_elements.remove(element);
    }

    remove_wire_branch(segment) {
        const remove_segments_queue = [segment];

        const segments_to_remove = [];

        while (remove_segments_queue.length) {
            const segment = remove_segments_queue.pop();

            if (segment.neighbor_segments.length <= 2) {
                if (segments_to_remove.includes(segment)) {
                    continue;
                }

                segments_to_remove.push(segment);

                for (const neighbor_segment of segment.neighbor_segments) {
                    remove_segments_queue.push(neighbor_segment);
                }
            }
        }

        for (const segment of segments_to_remove) {
            segment.connected_pos = null;
            segment.parent.wire_segments.remove(segment);

            for (const neighbor_segment of segment.neighbor_segments) {
                this.deconnect_wire_segments(segment, neighbor_segment);
            }
        }
    }

    elements_in_rect(pos, size) {
        const elements_in_rect = [];

        for (const element of this.elements()) {
            const rect = element.hitbox_rect();

            if (rects_overlap(rect.pos, rect.size, pos, size)) {
                elements_in_rect.push(element);
            }
        }

        return elements_in_rect;
    }

    set_parent(elements, parent) {
        for (const element of elements) {
            element.parent = parent;
        }
    }

    add_wire_segment(wire_segments) {
        const segment = new WireSegment;

        if (wire_segments.length) {
            segment.is_vertical = !wire_segments.last().is_vertical;

            this.connect_wire_segments(wire_segments.last(), segment);
        }

        wire_segments.push(segment);
        return segment;
    }
    remove_wire_segment(wire_segments) {
        if (wire_segments.length >= 2) {
            this.deconnect_wire_segments(wire_segments.pop(), wire_segments.last());
        }
        else {
            wire_segments.pop();
        }
    }

    deconnect_wire_segments(segment_a, segment_b) {
        segment_a.neighbor_segments.remove(segment_b);
        segment_b.neighbor_segments.remove(segment_a);
    }
    connect_wire_segments(segment_a, segment_b) {
        segment_a.neighbor_segments.push(segment_b);
        segment_b.neighbor_segments.push(segment_a);
    }

    connect_new_wire(new_wire_segments, start_node, end_element) {
        if (this.nodes_connectable(start_node, end_element)) {
            this.connect_nodes(start_node, end_element);

            const output_node = start_node instanceof OutputNode ? start_node : end_element;

            output_node.wire_segments = new_wire_segments.copy();
            new_wire_segments.last().connected_pos = end_element.anchor_pos_;

            this.set_parent(new_wire_segments, output_node);

            return true;
        }
        else if (end_element instanceof WireSegment) {
            new_wire_segments.last().connected_pos = null;

            if (new_wire_segments.last().is_vertical == end_element.is_vertical) {
                this.remove_wire_segment(new_wire_segments);
            }

            end_element.parent.wire_segments.push(...new_wire_segments);

            this.set_parent(new_wire_segments, end_element.parent);

            this.connect_wire_segments(new_wire_segments.last(), end_element);

            this.connect_nodes(end_element.parent, start_node);

            if (start_node instanceof OutputNode) {
                const start_segment = end_element.parent.wire_segments.find(
                    segment => segment.connected_pos == end_element.parent.anchor_pos_
                );
                this.remove_wire_branch(start_segment);

                this.set_parent([start_node], end_element.parent);

                start_node.next_nodes = [];
            }

            return true;
        }

        return false;
    }

    split_selected_segments() {
        for (const element of this.selected_elements_) {
            this.split_segment(element);
        }
    }
    split_segment(segment) {
        if (!(segment instanceof WireSegment)) {
            return;
        }

        // todo
    }

    nodes_connectable(start_node, end_node) {
        return start_node instanceof ConnectionNode
            && end_node instanceof ConnectionNode
            && (start_node instanceof OutputNode) != (end_node instanceof OutputNode)
            // && !(start_node.next_nodes && start_node.next_nodes.includes(end_node)
            // || end_node.next_nodes && end_node.next_nodes.includes(start_node));
    }
    connect_nodes(start_node, end_node) {
        if (!this.nodes_connectable(start_node, end_node)) {
            return;
        }

        const input_node = start_node instanceof InputNode ? start_node : end_node;
        const output_node = start_node instanceof OutputNode ? start_node : end_node;

        input_node.clear();

        output_node.next_nodes.push(input_node);

        this.queue_tick(input_node);
    }
}
