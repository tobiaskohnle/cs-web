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

        this.wire_start_node = null;
        this.new_wire_segments = [];
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
                // if (this.model.connect_new_wire_to(
                //     this.new_wire_segments,
                //     this.wire_start_node,
                //     this.hovered_element,
                // ))
                // {
                //     this.current_action = Enum.action.none;
                //     break;
                // }

                // this.wire_end_node = null;

                // const last_segment = this.new_wire_segments.last();

                // const new_segment = new WireSegment;

                // new_segment.vertical = !!(this.new_wire_segments.length & 1);
                // new_segment.connected_pos = last_segment.connected_pos; // mouse_world_pos

                // last_segment.connected_pos = null;

                // last_segment.neighbor_segments.push(new_segment);
                // new_segment.neighbor_segments.push(last_segment);

                // this.new_wire_segments.push(new_segment);

                break;

            default:
                if (event.buttons == 1) {
                    if (!(event.ctrlKey || event.shiftKey)) {
                        if (!this.hovered_element || !this.hovered_element.is_selected()) {
                            this.model.deselect_all();
                        }
                    }

                    this.model.select(this.current_hovered_element);

                    if (this.hovered_element == null) {
                        this.current_action = Enum.action.create_selection_box;
                    }
                    else if (this.hovered_element instanceof ConnectionNode) {
                        this.current_action = Enum.action.create_wire;
                        this.wire_start_node = this.hovered_element;
                        // current_tab.create_snapshot();
                    }
                    else {
                        this.current_action = Enum.action.move_elements;
                    }
                }
                else {
                    this.current_action = Enum.action.move_screen;
                }
                break;
        }
    }

    event_mouse_move(event) {
        this.mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_world_pos.set(current_tab.camera.to_worldspace(this.mouse_pos));

        const previous_hovered_element = this.hovered_element;
        this.hovered_element = this.model.get_element_at(this.mouse_world_pos);

        this.element_moved = this.element_moved
            || !Vec.sub(this.mouse_world_pos, this.mousedown_mouse_world_pos).round().equals(new Vec);

        const move_vec = new Vec(event.movementX, event.movementY);
        const world_move_vec = Vec.div(move_vec, current_tab.camera.anim_scale);

        this.mouse_movement.add(move_vec);
        this.abs_mouse_movement.add(Vec.abs(move_vec));

        this.mouse_world_movement.add(Vec.div(move_vec, current_tab.camera.anim_scale));

        switch (this.current_action) {
            case Enum.action.none:
                this.current_hovered_element = this.hovered_element;
                break;

            case Enum.action.move_screen:
                current_tab.camera.move(move_vec);
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
                // this.new_wire_segments[0].offset = this.mouse_world_pos.y;
                // this.new_wire_segments[1].offset = this.mouse_world_pos.x;
                break;

            case Enum.action.create_selection_box:
                // TEMP
                if (!(event.ctrlKey || event.shiftKey)) {
                    this.model.deselect_all();
                }
                // /TEMP
                for (const element of this.get_elements_in_selection_rect()) {
                    this.model.select(element);
                }
                break;

            case Enum.action.move_elements:
                this.model.move_selected_elements(world_move_vec, this.mouse_world_movement);
                break;
        }
    }

    event_mouse_up(event) {
        this.mouse_down = false;

        this.previous_main_gate = deep_copy(this.model.main_gate);

        if (!this.element_moved && this.hovered_element instanceof InputSwitch) {
            this.hovered_element.toggle();
            this.model.queue_tick(this.hovered_element.outputs[0]);
        }

        switch (this.current_action) {
            case Enum.action.move_screen:
                if (!this.mouse_moved()) {
                    this.model.deselect_all();
                    this.model.select(this.hovered_element);
                }
                this.current_action = Enum.action.none;
                break;

            case Enum.action.create_wire:
                if (this.wire_end_node) {
                    this.current_action = Enum.action.none;
                    this.model.connect_nodes(this.wire_start_node, this.wire_end_node);
                }
                else {
                    this.current_action = Enum.action.create_wire_segment;

                    this.new_wire_segments = [];

                    const first_segment = new WireSegment;
                    this.new_wire_segments.push(first_segment);

                    first_segment.connected_pos = this.wire_start_node.pos;
                    first_segment.vertical = false;

                    const second_segment = new WireSegment;
                    this.new_wire_segments.push(second_segment);

                    second_segment.connected_pos = this.mouse_world_pos
                    second_segment.vertical = true;

                    first_segment.neighbor_segments.push(second_segment);
                    second_segment.neighbor_segments.push(first_segment);
                }
                break;

            case Enum.action.create_wire_segment:
                break;

            default:
                this.current_action = Enum.action.none;
                break;
        }

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
    }

    get_elements_in_selection_rect() {
        return this.model.get_elements_in_rect(this.mouse_world_pos, this.selection_size());
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
        this.clipboard = extended_stringify(Array.from(this.model.selected_elements));
    }
    paste_copied_elements() {
        if (!this.clipboard) {
            return;
        }

        this.model.deselect_all();

        const copied_elements = extended_parse(this.clipboard);
        remove_loose_connections(copied_elements);

        const top_left_pos = get_bounding_rect(copied_elements).pos;

        for (const copied_element of copied_elements) {
            this.model.add(copied_element);

            const relative_pos = Vec.sub(copied_element.pos, top_left_pos);
            copied_element.pos.set(Vec.add(relative_pos, this.mouse_world_pos)).round();

            this.model.select(copied_element);
        }
    }

    get_file_string() {
        return extended_stringify(
            this.model.main_gate,
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
        this.model.add(gate);
    }

    create_custom_gate(gate) {
        this.init_element(gate);

        for (const inner_element of gate.inner_elements) {
            if (inner_element instanceof InputSwitch) {
                const input = new InputNode(gate);
                gate.inputs.push(input);

                input.is_inverted = inner_element.outputs[0].is_inverted;

                input.next_nodes = inner_element.outputs[0].next_nodes;
                inner_element.outputs[0].next_nodes = [];
            }
            if (inner_element instanceof OutputLight) {
                const output = new OutputNode(gate);
                gate.outputs.push(output);

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
