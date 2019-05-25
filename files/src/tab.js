'use strict';

class Tab {
    constructor() {
        this.camera = new Camera;
        this.reset();
    }

    reset() {
        this.model = new Model;
        this.controller = new Controller(this.model);
    }

    create_snapshot() {
        this.snapshot = deep_copy({
            model: this.model,
            wire_start_node: this.controller.wire_start_node,
            current_action: this.controller.current_action,
            hovered_element: this.controller.hovered_element,
            new_wire_segments: this.controller.new_wire_segments,
        });
    }

    load_snapshot() {
        if (this.snapshot) {
            const snapshot = deep_copy(this.snapshot);

            this.model = snapshot.model;
            this.controller.model = snapshot.model;
            this.controller.wire_start_node = snapshot.wire_start_node;
            this.controller.current_action = snapshot.current_action;
            this.controller.hovered_element = snapshot.hovered_element;
            this.controller.new_wire_segments = snapshot.new_wire_segments;
        }
    }
}
