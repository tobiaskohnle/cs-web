'use strict';

class Model {
    constructor() {
        this.ticked_nodes = new Set;
        this.selected_elements = new Set;

        this.main_gate = new CustomGate;
    }

    tick() {
        const next_ticked_nodes = new Set;

        for (const node of this.ticked_nodes) {
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

        this.ticked_nodes = next_ticked_nodes;
    }

    tick_all() {
        for (const element of this.elements()) {
            if (element instanceof ConnectionNode) {
                this.queue_tick(element);
            }
        }
    }

    update() {
        for (const element of this.elements()) {
            element.update();
        }

        for (const segment of current_tab.controller.new_wire_segments) {
            segment.update();
        }
    }

    // TEMP
    selected_elements_array() {
        return Array.from(this.selected_elements);
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
                for (const input of element.inputs) {
                    elements.push(input);
                }
                for (const output of element.outputs) {
                    elements.push(output);
                }
            }
        }

        return elements;
    }

    queue_tick(node) {
        this.ticked_nodes.add(node);
    }

    update_all_last_pos() {
        for (const element of this.elements()) {
            if (element.update_last_pos) {
                element.update_last_pos();
            }
        }
    }

    get_element_at(pos) {
        let nearest_element = null;
        let min_dist = Infinity;

        for (const element of this.elements()) {
            const dist = element.distance(pos);

            if (dist < min_dist) {
                min_dist = dist;
                nearest_element = element;
            }
        }

        return nearest_element;
    }

    move_selected_elements(vec, total_vec) {
        for (const element of this.selected_elements) {
            element.move(vec, total_vec);
        }
    }

    invert_selected_connection_nodes() {
        for (const element of this.selected_elements) {
            if (element instanceof ConnectionNode) {
                element.invert();
            }
        }
    }

    select(element) {
        if (element == null) {
            return;
        }

        this.selected_elements.add(element);
    }

    select_all() {
        for (const element of this.elements()) {
            this.selected_elements.add(element);
        }
    }

    deselect(element) {
        if (element == null) {
            return;
        }

        this.selected_elements.delete(element);
    }

    deselect_all() {
        this.selected_elements = new Set;
    }

    add(element) {
        if (element == null) {
            return;
        }

        if (!(element instanceof Gate)) {
            return;
        }

        this.main_gate.inner_elements.push(element);
    }

    delete_selected_elements() {
        for (const element of this.selected_elements) {
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

    get_elements_in_rect(pos, size) {
        const elements_in_rect = [];

        for (const element of this.elements()) {
            const rect = element.hitbox_rect();

            if (rects_overlap(rect.pos, rect.size, pos, size)) {
                elements_in_rect.push(element);
            }
        }

        return elements_in_rect;
    }

    connected_wire_segments(segment_a, segment_b) {
        segment_a.neighbor_segments.push(segment_b);
        segment_b.neighbor_segments.push(segment_a);
    }

    connect_new_wire_to(new_wire_segments, start_node, element) {
        if (
            this.nodes_connectable(start_node, element)
            && !this.nodes_connected(start_node, element)
        ) {
            this.wire_end_node = element;
            this.connect_nodes(start_node, this.wire_end_node);

            this.main_gate.inner_elements.push(...new_wire_segments);
            new_wire_segments.last().connected_pos = this.wire_end_node.pos;

            return true;
        }
        else if (element instanceof WireSegment) {
            const mouse_segment = new_wire_segments.pop();
            new_wire_segments.last().neighbor_segments.remove(mouse_segment);

            if (new_wire_segments.last().vertical == element.vertical) {
                const new_segment = new WireSegment;
                new_segment.vertical = !!(new_wire_segments.length & 1);

                new_wire_segments.push(new_segment);
            }

            this.main_gate.inner_elements.push(...new_wire_segments);

            this.connected_wire_segments(new_wire_segments.last(), element);

            return true;
        }

        return false;
    }

    nodes_connectable(start_node, end_node) {
        return start_node instanceof ConnectionNode
            && end_node instanceof ConnectionNode
            && (start_node instanceof OutputNode) != (end_node instanceof OutputNode);
    }
    nodes_connected(start_node, end_node) {
        return this.nodes_connectable(start_node, end_node)
            && (start_node.next_nodes && start_node.next_nodes.includes(end_node)
            || end_node.next_nodes && end_node.next_nodes.includes(start_node));
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
