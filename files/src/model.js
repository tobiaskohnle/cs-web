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
