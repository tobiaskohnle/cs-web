'use strict';

class Controller {
    constructor(model) {
        this.model = model;

        this.open_menu_stack = [];
        this.mousedown_mouse_pos = new Vec;
        this.mousedown_mouse_world_pos = new Vec;
        this.mouse_pos = new Vec;
        this.mouse_world_pos = new Vec;
        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
        this.abs_mouse_movement = new Vec;
        this.current_action = Enum.action.none;
        this.hovered_element = null;
        this.moving_elements = [];
        this.saved_elements_in_rect = new Set;

        this.wire_start_node = null;
        this.new_wire_segments = [];
    }

    run_command(name) {
        const command = commands.find(command => command.name == name);

        if (command) {
            command.command();
        }
    }

    key_down(event) {
        if (this.current_action == Enum.action.edit_labels) {
            let result = true;

            for (const element of this.model.selected_elements_) {
                if (element instanceof Label) {
                    if (!element.key_down(event)) {
                        result = false;
                    }
                }
            }

            if (!result) {
                return false;
            }
        }

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

    mouse_down(event) {
        this.is_mouse_down = true;

        this.element_moved = false;

        if ((event.detail-1) & 1) {
            if (this.hovered_element instanceof ConnectionNode) {
                this.hovered_element.invert();
                return;
            }
        }

        this.model.update_all_last_pos();

        this.mousedown_mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mousedown_mouse_world_pos = current_tab.camera.to_worldspace(this.mousedown_mouse_pos);

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
        this.abs_mouse_movement = new Vec;

        switch (this.current_action) {
            case Enum.action.create_wire_segment:
                if (this.model.connect_new_wire_to(
                    this.new_wire_segments,
                    this.wire_start_node,
                    this.hovered_element,
                ))
                {
                    this.current_action = Enum.action.none;
                    this.new_wire_segments = [];
                    break;
                }

                this.new_wire_segments.last().connected_pos = null;
                const segment = this.model.add_wire_segment(this.new_wire_segments);
                this.new_wire_segments.last().connected_pos = this.mouse_world_pos;

                segment.update();
                segment.cancel_animation();
                break;

            default:
                if (event.buttons == 1) {
                    if (!event.shiftKey && !event.ctrlKey && (!this.hovered_element || !this.hovered_element.is_selected())) {
                        this.model.deselect_all();
                    }

                    if (this.hovered_element) {
                        if (this.is_selected(this.hovered_element.is_selected(), event.shiftKey, event.ctrlKey)) {
                            this.model.select(this.hovered_element);
                        }
                        else {
                            this.model.deselect(this.hovered_element);
                        }

                        this.current_action = Enum.action.move_elements;

                        const selected_elements = this.model.selected_elements_array();

                        if (selected_elements.every(element => element instanceof ConnectionNode)) {
                            this.moving_elements = selected_elements;
                        }
                        else {
                            this.moving_elements = selected_elements.filter(element => element instanceof ConnectionNode == false);
                        }

                        for (const element of this.moving_elements) {
                            if (element.grab) element.grab();
                        }
                    }
                    else {
                        // if (this.hovered_element instanceof ConnectionNode) {
                        //     this.current_action = Enum.action.create_wire;
                        //     this.wire_start_node = this.hovered_element;
                        //     // current_tab.create_snapshot();
                        // }

                        this.current_action = Enum.action.create_selection_box;

                        this.saved_selected_elements = this.model.selected_elements_array();
                    }
                }
                break;
        }
    }

    mouse_move(event) {
        this.mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_world_pos.set(current_tab.camera.to_worldspace(this.mouse_pos));

        const previous_hovered_element = this.hovered_element;
        this.hovered_element = this.model.element_at(this.mouse_world_pos);

        this.element_moved = this.element_moved
            || !Vec.sub(this.mouse_world_pos, this.mousedown_mouse_world_pos).round().equals(new Vec);

        const move_vec = new Vec(event.movementX, event.movementY);
        const world_move_vec = Vec.div(move_vec, current_tab.camera.anim_scale_);

        this.mouse_movement.add(move_vec);
        this.abs_mouse_movement.add(Vec.abs(move_vec));

        this.mouse_world_movement.add(Vec.div(move_vec, current_tab.camera.anim_scale_));

        if (event.buttons & -2) {
            current_tab.camera.move(move_vec);
        }

        switch (this.current_action) {
            case Enum.action.none:
                this.current_hovered_element = this.hovered_element;
                break;

            case Enum.action.create_wire:
                if (
                    this.model.nodes_connectable(this.wire_start_node, this.hovered_element)
                    && !this.model.nodes_connected(this.wire_start_node, this.hovered_element)
                ) {
                    // current_tab.load_snapshot();
                    // this.model.connect_nodes(this.wire_start_node, this.hovered_element);
                    this.wire_end_node = this.hovered_element;
                }
                else {
                    this.wire_end_node = null;
                }
                break;

            case Enum.action.create_wire_segment:
                if (
                    this.model.nodes_connectable(this.wire_start_node, this.hovered_element)
                    && !this.model.nodes_connected(this.wire_start_node, this.hovered_element)
                ) {
                    // current_tab.load_snapshot();
                    // this.model.connect_nodes(this.wire_start_node, this.hovered_element);
                    this.wire_end_node = this.hovered_element;
                }
                else {
                    this.wire_end_node = null;
                }

                if (this.wire_end_node) {
                    this.new_wire_segments.last().connected_pos = this.wire_end_node.pos//anchor_pos_;
                }
                else {
                    this.new_wire_segments.last().connected_pos = this.mouse_world_pos;
                }
                break;

            case Enum.action.create_selection_box:
                const selection_size = Vec.sub(this.mousedown_mouse_world_pos, this.mouse_world_pos);
                const elements_in_rect = new Set(this.model.elements_in_rect(this.mouse_world_pos, selection_size));

                const elements_entering_rect = new Set(elements_in_rect);
                for (const element of this.saved_elements_in_rect) {
                    elements_entering_rect.delete(element);
                }

                const elements_leaving_rect = new Set(this.saved_elements_in_rect);
                for (const element of elements_in_rect) {
                    elements_leaving_rect.delete(element);
                }

                for (const element of elements_entering_rect) {
                    const is_selected = this.is_selected(element.is_selected(), event.shiftKey, event.ctrlKey);
                    this.model.set_selected(element, is_selected);
                }
                for (const element of elements_leaving_rect) {
                    const is_selected = this.saved_selected_elements.includes(element);
                    this.model.set_selected(element, is_selected);
                }

                this.saved_elements_in_rect = elements_in_rect;
                break;

            case Enum.action.move_elements:
                this.model.move_elements(this.moving_elements, world_move_vec, this.mouse_world_movement);
                break;
        }
    }

    mouse_up(event) {
        this.is_mouse_down = false;

        if (!this.element_moved && this.hovered_element instanceof InputSwitch) {
            this.hovered_element.toggle();
            this.model.queue_tick(this.hovered_element.outputs[0]);
        }

        for (const element of this.moving_elements) {
            if (element.release) element.release();
        }

        switch (this.current_action) {
            case Enum.action.none:
                // if (!this.mouse_moved()) {
                //     this.model.deselect_all();
                //     this.model.select(this.hovered_element);
                // }
                break;

            case Enum.action.create_wire:
                if (this.wire_end_node) {
                    this.current_action = Enum.action.none;
                    this.model.connect_nodes(this.wire_start_node, this.wire_end_node);
                }
                else {
                    this.current_action = Enum.action.create_wire_segment;

                    this.new_wire_segments = [];

                    const segment_a = current_tab.model.add_wire_segment(this.new_wire_segments);
                    segment_a.is_vertical = this.wire_start_node.is_vertical();

                    const segment_b = current_tab.model.add_wire_segment(this.new_wire_segments);

                    segment_a.connected_pos = this.wire_start_node.anchor_pos_;
                    segment_b.connected_pos = this.mouse_world_pos;

                    segment_a.update();
                    segment_b.update();

                    segment_a.cancel_animation();
                    segment_b.cancel_animation();
                }
                break;

            case Enum.action.create_wire_segment:
                break;

            case Enum.action.edit_labels:
                if (!this.hovered_element) {
                    this.current_action = Enum.action.none;
                }
                break;

            default:
                if (!this.element_moved) {
                    if (this.hovered_element instanceof Label) {
                        if (this.hovered_element.is_selected()) {
                            this.current_action = Enum.action.edit_labels;
                            break;
                        }
                    }
                }

                this.current_action = Enum.action.none;
                break;
        }

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
    }

    is_selected(was_selected, modifier_shift, modifier_ctrl) {
        if (modifier_shift && modifier_ctrl) {
            return false;
        }
        if (modifier_shift) {
            return true;
        }
        if (modifier_ctrl) {
            return !was_selected;
        }
        return true;
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
                const reader = new FileReader;

                reader.onload = function() {
                    onload(reader.result);
                }

                reader.readAsText(file);
            }
        }
    }

    copy_selected_elements() {
        this.clipboard = extended_stringify(Array.from(this.model.selected_elements_));
    }
    paste_copied_elements() {
        if (!this.clipboard) {
            return;
        }

        this.model.deselect_all();

        const copied_elements = extended_parse(this.clipboard);
        remove_loose_connections(copied_elements);

        const top_left_pos = bounding_rect(copied_elements).pos;

        const offset = Vec.sub(Vec.round(this.mouse_world_pos), top_left_pos);

        // for (const e of copied_elements) if (e.update_last_pos) e.update_last_pos();

        for (const copied_element of copied_elements) {
            this.model.add(copied_element);

            if (copied_element instanceof Gate || copied_element instanceof WireSegment)
            copied_element.move(offset, offset);

            this.model.select(copied_element);
        }
    }

    file_string() {
        return extended_stringify(
            this.model.main_gate,
            function(key, value) {
                // if (key.endsWith('_')) return;
                return value;
            },
            2,
        );
    }

    init_element(element) {
        element.pos.set(this.mousedown_mouse_world_pos).round();

        if (element instanceof Gate) {
            element.set_nodes_pos();
            element.cancel_animation();
            element.nodes_init_animation();
        }

        this.model.add(element);
    }

    create_custom_gate(gate) {
        this.init_element(gate);

        for (const inner_element of gate.inner_elements) {
            if (inner_element instanceof InputSwitch) {
                gate.add_input_node();

                input.is_inverted = inner_element.outputs[0].is_inverted;

                input.next_nodes = inner_element.outputs[0].next_nodes;
                inner_element.outputs[0].next_nodes = [];
            }
            if (inner_element instanceof OutputLight) {
                gate.add_output_node();

                output.is_inverted = inner_element.inputs[0].is_inverted;

                const prev_node = inner_element.inputs[0].previous_node();

                prev_node.next_nodes.remove(inner_element.inputs[0]);
                prev_node.next_nodes.push(output);
            }
        }
    }

    reset_view() {
        current_tab.camera.reset();
    }

    mouse_moved() {
        return this.abs_mouse_movement.length() > 5;
    }
}
