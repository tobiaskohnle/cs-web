'use strict';

class Controller {
    constructor() {
        this.open_menu_stack = [];
        this.mousedown_mouse_pos = new Vec;
        this.mousedown_mouse_world_pos = new Vec;
        this.mouse_pos = new Vec;
        this.mouse_world_pos = new Vec;
        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
        this.abs_mouse_movement = new Vec;
        this.mouse_move_state = mouse_move_state.update_hovered_element;
        this.hovered_element = null;
        this.wire_start_node = null;

        this.previous_main_gate = null;
    }

    event_key_down(event) {
        for (const command of commands) {
            for (const shortcut of command.shortcuts) {
                if (shortcut.matches_event(event)) {
                    command.command();
                    return false;
                }
            }
        }

        return !config.block_unused_key_combinations;
    }

    event_mouse_down(event) {
        this.mouse_down = true;

        this.previous_main_gate = deep_copy(model.main_gate);

        if (this.hovered_element instanceof InputSwitch) {
            this.hovered_element.toggle();
            model.queue_tick(this.hovered_element.outputs[0]);
        }

        if ((event.detail-1) & 1) {
            if (this.hovered_element instanceof ConnectionNode) {
                this.hovered_element.invert();
                return;
            }
        }

        model.update_all_last_pos();

        this.mousedown_mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mousedown_mouse_world_pos = camera.to_worldspace(this.mousedown_mouse_pos);

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
        this.abs_mouse_movement = new Vec;

        if (event.buttons == 1) {
            if (!(event.ctrlKey || event.shiftKey)) {
                if (!this.hovered_element || !this.hovered_element.is_selected()) {
                    model.deselect_all();
                }
            }

            model.select(this.current_hovered_element);

            if (this.hovered_element == null) {
                this.mouse_move_state = mouse_move_state.creating_selection_box;
            }
            else if (this.hovered_element instanceof ConnectionNode) {
                this.mouse_move_state = mouse_move_state.creating_wire;
                this.wire_start_node = this.hovered_element;
            }
            else {
                this.mouse_move_state = mouse_move_state.moving_elements;
            }
        }
        else {
            this.mouse_move_state = mouse_move_state.move_screen;
        }
    }

    event_mouse_move(event) {
        this.mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_world_pos = camera.to_worldspace(this.mouse_pos);

        this.hovered_element = model.get_element_at(this.mouse_world_pos);

        const move_vec = new Vec(event.movementX, event.movementY);
        const world_move_vec = Vec.div(move_vec, camera.anim_scale);

        this.mouse_movement.add(move_vec);
        this.abs_mouse_movement.add(Vec.abs(move_vec));

        this.mouse_world_movement.add(Vec.div(move_vec, camera.anim_scale));

        switch (this.mouse_move_state) {
            case mouse_move_state.update_hovered_element:
                this.current_hovered_element = this.hovered_element;
                break;
            case mouse_move_state.move_screen:
                camera.move(move_vec);
                break;
            case mouse_move_state.creating_wire:
                model.main_gate = deep_copy(this.previous_main_gate);
                this.wire_start_node = model.get_element_at(this.wire_start_node.pos);
                this.hovered_element = this.hovered_element ? model.get_element_at(this.hovered_element.pos) : null;

                if (this.hovered_element instanceof ConnectionNode) {
                    model.connect_nodes(this.wire_start_node, this.hovered_element);
                }
                break;
            case mouse_move_state.creating_selection_box:
                // TEMP
                if (!(event.ctrlKey || event.shiftKey)) {
                    model.deselect_all();
                }
                // /TEMP
                for (const element of model.get_elements_in_selection_box()) {
                    model.select(element);
                }
                break;
            case mouse_move_state.moving_elements:
                model.move_selected_elements(world_move_vec, this.mouse_world_movement);
                break;
        }
    }

    event_mouse_up(e) {
        this.mouse_down = false;

        this.previous_main_gate = deep_copy(model.main_gate);

        switch (this.mouse_move_state) {
            case mouse_move_state.move_screen:
                if (!controller.mouse_moved()) {
                    model.deselect_all();
                    model.select(this.hovered_element);
                }
                break;
        }

        this.mouse_move_state = mouse_move_state.update_hovered_element;

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;

        model.update_all_last_pos();
    }

    read_files(onload) {
        const input = document.createElement('input');
        input.type = 'file';
        input.setAttribute('multiple', '');
        // input.setAttribute('directory', '');
        // input.setAttribute('webkitdirectory', '');

        input.click();

        input.onchange = function(e) {
            const files = input.files;

            for (const file of files) {
                const reader = new FileReader();

                reader.onload = function() {
                    onload(reader.result);
                }

                reader.readAsText(file);
            }
        }
    }

    copy_selected_elements() {
        controller.clipboard = JSON.stringify(
            prepare_for_stringify(deep_copy(Array.from(model.selected_elements)))
        );
    }
    paste_copied_elements() {
        if (!controller.clipboard) {
            return;
        }

        model.deselect_all();

        const copied_elements = edit_after_parse(JSON.parse(controller.clipboard));
        remove_loose_connections(copied_elements);

        const top_left_pos = get_bounding_rect(copied_elements).pos;

        for (const copied_element of copied_elements) {
            model.add(copied_element);

            const relative_pos = Vec.sub(copied_element.pos, top_left_pos);
            copied_element.pos.set(Vec.add(relative_pos, this.mouse_world_pos)).round();

            model.select(copied_element);
        }
    }

    get_file_string() {
        return JSON.stringify(
            prepare_for_stringify(deep_copy(model.main_gate)),
            function(key, value) {
                if (key == 'anim_pos' || key == 'last_pos') {
                    return;
                }
                return value;
            },
            2,
        );
    }

    selection_size() {
        return Vec.sub(this.mousedown_mouse_world_pos, this.mouse_world_pos);
    }

    init_element(gate) {
        gate.pos.set(this.mousedown_mouse_world_pos).round();
        gate.cancel_animation();
        model.add(gate);
    }

    create_custom_gate(gate) {
        this.init_element(gate);

        for (const inner_gate of gate.inner_gates) {
            if (inner_gate instanceof InputSwitch) {
                const input = new InputNode(gate);
                gate.inputs.push(input);

                input.is_inverted = inner_gate.outputs[0].is_inverted;

                input.next_nodes = inner_gate.outputs[0].next_nodes;
                inner_gate.outputs[0].next_nodes = [];
            }
            if (inner_gate instanceof OutputLight) {
                const output = new OutputNode(gate);
                gate.outputs.push(output);

                output.is_inverted = inner_gate.inputs[0].is_inverted;

                const prev_node = inner_gate.inputs[0].previous_node();

                prev_node.next_nodes.remove(inner_gate.inputs[0]);
                prev_node.next_nodes.push(output);
            }
        }
    }

    reset_view() {
        camera.reset();
    }

    mouse_moved() {
        return this.abs_mouse_movement.length() > 5;
    }
}
