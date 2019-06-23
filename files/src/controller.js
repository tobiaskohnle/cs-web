'use strict';

class Controller {
    constructor(model) {
        this.model = model;

        this.open_menu_stack = [];
        this.mouse_down_pos = new Vec;
        this.mouse_down_world_pos = new Vec;
        this.mouse_pos = new Vec;
        this.mouse_world_pos = new Vec;
        this.snapped_mouse_world_pos = new Vec;
        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
        this.abs_mouse_movement = new Vec;
        this.current_action = Enum.action.none;
        this.hovered_element = null;
        this.moving_elements = [];
        this.saved_elements_in_rect = new Set;

        this.wire_start_node = null;
        this.new_wire_segments = [];

        this.element_mouse_captured = null;

        this.undo_stack = [];
        this.redo_stack = [];
    }

    capture_mouse(element) {
        this.element_mouse_captured = element;
    }

    release_mouse() {
        this.element_mouse_captured = null;
    }

    run_command(name) {
        const command = commands.find(command => command.name == name);

        if (command) {
            command.command();
        }
    }

    key_down(event) {
        if (this.current_action == Enum.action.edit_elements) {
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
        this.abs_mouse_movement = new Vec;

        this.mouse_down_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_down_world_pos = current_tab.camera.to_worldspace(this.mouse_down_pos);

        if (event.button & -2) {
            this.capture_mouse(canvas);
        }
        if (event.button != 0) {
            return;
        }

        if (this.current_action == Enum.action.create_wire || this.current_action == Enum.action.create_wire_segment) {
            return;
        }

        this.elements_moved = false;

        this.model.update_all_last_pos();

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;

        if ((event.detail-1) & 1) {
            if (this.hovered_element instanceof ConnectionNode) {
                this.hovered_element.invert();
                return;
            }

            // if (this.current_action == Enum.action.move_elements) {
                this.current_action = Enum.action.edit_elements;
                config.DEBUG_LOG && console.log('EDIT');
                return;
            // }
        }

        switch (this.current_action) {
            default:
                const any_modifier = event.shiftKey || event.ctrlKey || event.altKey;

                if (!any_modifier && (!this.hovered_element || !this.hovered_element.is_selected())) {
                    this.model.deselect_all();
                }

                if (this.hovered_element) {
                    if (this.is_selected(this.hovered_element.is_selected(), event.shiftKey, event.ctrlKey)) {
                        this.model.select(this.hovered_element);
                    }
                    else {
                        this.model.deselect(this.hovered_element);
                    }

                    if (this.hovered_element instanceof ConnectionNode && !any_modifier) {
                        if (this.current_action != Enum.action.edit_elements) {
                            this.current_action = Enum.action.start_wire;
                            this.capture_mouse(canvas);
                            this.wire_start_node = this.hovered_element;

                            this.saved_state_create_wire = this.get_state();
                        }
                    }
                    else {
                        this.saved_state_move_elements = this.get_state();

                        this.is_mouse_down = true;

                        this.current_action = Enum.action.move_elements;
                        this.capture_mouse(canvas);

                        const selected_elements = this.model.selected_elements_array();

                        if (selected_elements.every(element => element instanceof ConnectionNode)) {
                            this.moving_elements = selected_elements;
                        }
                        else {
                            this.moving_elements = selected_elements.filter(element => element instanceof ConnectionNode == false);
                        }

                        for (const element of this.moving_elements) {
                            if (element.mouse_down) element.mouse_down();
                        }
                    }
                }
                else {
                    this.current_action = Enum.action.create_selection_box;
                    this.capture_mouse(canvas);

                    this.saved_selected_elements = this.model.selected_elements_array();
                }
                break;

            case Enum.action.edit_elements:
            case Enum.action.edit_elements_resize:
                this.current_action = Enum.action.edit_elements;

                if (this.hovered_element instanceof Label) {
                    for (const element of this.model.selected_elements_) {
                        if (element instanceof Label) {
                            element.event_mouse_down(event);
                        }
                    }
                }
                if (this.hovered_element instanceof Gate || this.hovered_element instanceof Label) {
                    this.current_action = Enum.action.edit_elements_resize;
                }

                break;
        }
    }

    mouse_move(event) {
        document.documentElement.style.cursor = '';

        const move_vec = new Vec(event.movementX, event.movementY);

        this.abs_mouse_movement.add(Vec.abs(move_vec));

        if (event.buttons & -2) {
            current_tab.camera.move(move_vec);
        }

        this.mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_world_pos.set(current_tab.camera.to_worldspace(this.mouse_pos));
        this.snapped_mouse_world_pos.set(Vec.round(this.mouse_world_pos, .5));

        const world_move_vec = Vec.div(move_vec, current_tab.camera.anim_scale_);

        this.mouse_movement.add(move_vec);
        this.mouse_world_movement.add(world_move_vec);

        let filter;

        if (this.current_action == Enum.action.create_wire || this.current_action == Enum.action.create_wire_segment) {
            filter = element => current_tab.model.nodes_connectable(current_tab.controller.wire_start_node, element)
                || element instanceof WireSegment && !current_tab.controller.new_wire_segments.includes(element);
        }

        const hovered_element = this.model.element_at(this.mouse_world_pos, filter);
        const other_hovered_element = this.hovered_element != hovered_element;

        if (other_hovered_element) {
            this.hovered_element = hovered_element;
            config.DEBUG_LOG && console.log(`%cnew hovered element: %c${hovered_element && hovered_element.constructor.name}`,
                'color:#f90',
                hovered_element ? 'color:#fd4' : 'color:#777',
            );
        }

        switch (this.current_action) {
            case Enum.action.start_wire:
                if (this.mouse_moved()) {
                    this.current_action = Enum.action.create_wire;
                    this.capture_mouse(canvas);

                    this.new_wire_segments = [];

                    const segment_a = this.model.add_wire_segment(this.new_wire_segments);
                    segment_a.is_vertical = this.wire_start_node.is_vertical();
                    if (this.wire_start_node instanceof OutputNode) {
                        segment_a.parent = this.wire_start_node;
                    }
                    const segment_b = this.model.add_wire_segment(this.new_wire_segments);
                    segment_b.auto_offset_ = true;
                    const segment_c = this.model.add_wire_segment(this.new_wire_segments);

                    segment_a.set_connected_pos(this.wire_start_node.anchor_pos_);
                    segment_c.set_connected_pos(this.snapped_mouse_world_pos);

                    segment_a.cancel_animation();
                    segment_b.cancel_animation();
                    segment_c.cancel_animation();

                    current_tab.create_snapshot();
                }
                break;

            case Enum.action.create_wire:
                // if (this.wire_start_node.anchor_pos_.x < this.mouse_world_pos.x && this.new_wire_segments.length == 3) {
                //     this.new_wire_segments[0].is_vertical = true;
                //     this.new_wire_segments[1].is_vertical = false;
                //     this.new_wire_segments[2].is_vertical = true;
                // }
                // else {
                //     this.new_wire_segments[0].is_vertical = false;
                //     this.new_wire_segments[1].is_vertical = true;
                //     this.new_wire_segments[2].is_vertical = false;
                // }

            case Enum.action.create_wire_segment:
                this.new_wire_segments.last().auto_offset_ = false;

                if (other_hovered_element) {
                    const last_snapped_mouse_world_pos = this.snapped_mouse_world_pos;
                    const last_hovered_element = this.hovered_element;
                    const last_new_wire_segments = deep_copy(this.new_wire_segments);

                    current_tab.load_snapshot();

                    this.hovered_element = last_hovered_element &&
                        this.model.elements().find(element => element.id_ == last_hovered_element.id_);

                    this.action_successful_create_wire = this.model.connect_new_wire(
                        this.new_wire_segments, this.wire_start_node, this.hovered_element,
                    );

                    // TEMP
                    // for (let i = -1; i > -Math.min(this.new_wire_segments.length, last_new_wire_segments.length); i--) {
                    //     const new_segment = this.new_wire_segments.at(i);
                    //     const last_new_segment = last_new_wire_segments.at(i);

                    //     new_segment.anim_offset_ = last_new_segment.anim_offset_;

                    //     if (new_segment.offset_pos) {
                    //         new_segment.anim_offset_pos = last_new_segment.anim_offset_pos_;
                    //     }
                    //     if (new_segment.normal_pos) {
                    //         new_segment.anim_normal_pos = last_new_segment.anim_normal_pos_;
                    //     }
                    //     new_segment.set_connected_pos(last_snapped_mouse_world_pos);
                    // }
                    // /TEMP
                }
                break;

            case Enum.action.create_selection_box:
                const selection_size = Vec.sub(this.mouse_down_world_pos, this.mouse_world_pos);
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
                const snap_size = this.model.move_elements(this.moving_elements, this.mouse_world_movement);
                const elements_moved = !Vec.sub(this.mouse_world_pos, this.mouse_down_world_pos).round(snap_size).equals(new Vec);
                this.elements_moved = this.elements_moved || elements_moved;
                break;

            case Enum.action.import_element:
                // TEMP
                console.assert(this.imported_element);

                if (!this.model.elements().includes(this.imported_element)) {
                    this.save_state('import element');
                    this.model.add(this.imported_element);
                }

                const element_pos = Vec.sub(this.mouse_world_pos, Vec.div(this.imported_element.size, 2));
                this.imported_element.pos.set(Vec.round(element_pos, this.imported_element.snap_size_));

                break;


            case Enum.action.edit_elements:
                for (const element of this.model.selected_elements_) {
                    if (element instanceof Label) {
                        element.event_mouse_move(event);
                    }
                }

                if (this.hovered_element instanceof Gate || this.hovered_element instanceof Label) {
                    this.resize = {
                        north: Math.abs(this.mouse_world_pos.y - this.hovered_element.pos.y                              ) < .5,
                        south: Math.abs(this.mouse_world_pos.y - this.hovered_element.pos.y - this.hovered_element.size.y) < .5,
                        east:  Math.abs(this.mouse_world_pos.x - this.hovered_element.pos.x - this.hovered_element.size.x) < .5,
                        west:  Math.abs(this.mouse_world_pos.x - this.hovered_element.pos.x                              ) < .5,
                    };

                    this.resize.cursor =
                        this.resize.east && this.resize.south ? 'se-resize' :
                        this.resize.south && this.resize.west ? 'sw-resize' :
                        this.resize.north && this.resize.east ? 'ne-resize' :
                        this.resize.north && this.resize.west ? 'nw-resize' :
                        this.resize.east                      ? 'e-resize'  :
                        this.resize.south                     ? 's-resize'  :
                        this.resize.north                     ? 'n-resize'  :
                        this.resize.west                      ? 'w-resize'  :
                        '';

                    this.resize.vec = new Vec(
                        this.resize.east  ? 1 : this.resize.west  ? -1 : 0,
                        this.resize.south ? 1 : this.resize.north ? -1 : 0,
                    );

                    document.documentElement.style.cursor = this.resize.cursor;
                }

                break;

            case Enum.action.edit_elements_resize:
                for (const element of this.model.selected_elements_) {
                    element.resize(this.mouse_world_movement, this.resize.vec);
                }

                break;
        }
    }

    mouse_up(event) {
        if (event.button != 0) {
            return;
        }

        this.is_mouse_down = false;

        if (this.current_action != Enum.action.imported_element) {
            for (const element of this.moving_elements) {
                if (element.mouse_up) element.mouse_up();
            }
        }

        if (this.elements_moved == false) {
            if (this.hovered_element instanceof InputSwitch) {
                this.hovered_element.toggle();
                this.model.queue_tick(this.hovered_element.outputs[0]);
            }
        }

        switch (this.current_action) {
            case Enum.action.edit_elements_resize:
                this.current_action = Enum.action.edit_elements;
                break;

            case Enum.action.edit_elements:
                if (!this.hovered_element) {
                    this.current_action = Enum.action.none;
                }
                break;

            case Enum.action.create_wire_segment:
            case Enum.action.create_wire:
                if (this.action_successful_create_wire) {
                    if (this.new_wire_segments.last().offset_pos == this.snapped_mouse_world_pos) {
                        this.new_wire_segments.last().offset_pos = null;
                    }
                    if (this.new_wire_segments.last().norma_pos == this.snapped_mouse_world_pos) {
                        this.new_wire_segments.last().norma_pos = null;
                    }

                    config.DEBUG_LOG && console.log('create_wire success');
                    this.current_action = Enum.action.none;

                    for (const segment of this.new_wire_segments) {
                        segment.auto_offset_ = false;
                    }
                    this.new_wire_segments = [];

                    this.save_state('create wire', this.saved_state_create_wire);
                }
                else if (this.current_action == Enum.action.create_wire) {
                    config.DEBUG_LOG && console.log('create_wire mouse_up');
                    this.current_action = Enum.action.create_wire_segment;
                    this.capture_mouse(canvas);

                    this.new_wire_segments = [];

                    const segment_a = current_tab.model.add_wire_segment(this.new_wire_segments);
                    segment_a.is_vertical = this.wire_start_node.is_vertical();
                    if (this.wire_start_node instanceof OutputNode) {
                        segment_a.parent = this.wire_start_node;
                    }

                    const segment_b = current_tab.model.add_wire_segment(this.new_wire_segments);

                    segment_a.set_connected_pos(this.wire_start_node.anchor_pos_);
                    segment_b.set_connected_pos(this.snapped_mouse_world_pos);

                    segment_a.cancel_animation();
                    segment_b.cancel_animation();

                    current_tab.create_snapshot();
                }
                else {
                    config.DEBUG_LOG && console.log('create_wire_segment mouse_up');

                    this.new_wire_segments.last().set_connected_pos(null);

                    const segment = this.model.add_wire_segment(this.new_wire_segments);
                    segment.set_connected_pos(this.snapped_mouse_world_pos);
                    segment.cancel_animation();

                    current_tab.create_snapshot();
                }
                break;

            case Enum.action.move_elements:
                if (this.elements_moved) {
                    this.save_state('moved elements', this.saved_state_move_elements);
                }
                this.current_action = Enum.action.none;
                break;

            default:
                this.current_action = Enum.action.none;
                break;
        }

        this.mouse_movement = new Vec;
        this.mouse_world_movement = new Vec;
    }

    mouse_wheel(event) {
        const scale_factor = event.deltaY < 0 ? config.scale_factor : 1/config.scale_factor;
        current_tab.camera.scale_at(this.mouse_pos, scale_factor);
    }

    mouse_leave(event) {
        this.hovered_element = null;
    }

    sidebar_mouse_down(event) {
        current_tab.sidebar.mouse_down(event);
    }

    sidebar_mouse_move(event) {
        current_tab.sidebar.mouse_move(event);
    }

    sidebar_mouse_up(event) {
    }

    sidebar_mouse_wheel(event) {
        current_tab.sidebar.scroll_by(event.deltaY);
    }

    sidebar_mouse_leave(event) {
        current_tab.sidebar.mouse_leave(event);
    }

    get_state() {
        return deep_copy(this.model.main_gate);
    }
    save_state(message, state=this.get_state()) {
        config.DEBUG_LOG && console.log(`%cSAVE STATE: ${message}`, 'color:#4c4');
        this.undo_stack.push(state);
        this.redo_stack = [];
    }

    undo() {
        if (this.undo_stack.length) {
            this.redo_stack.push(deep_copy(this.model.main_gate));
            this.model.main_gate = this.undo_stack.pop();
            this.current_action = Enum.action.none;
        }
    }
    redo() {
        if (this.redo_stack.length) {
            this.undo_stack.push(deep_copy(this.model.main_gate));
            this.model.main_gate = this.redo_stack.pop();
            this.current_action = Enum.action.none;
        }
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

    copy() {
        this.clipboard = extended_stringify(this.model.selected_elements_array());
    }
    paste() {
        if (!this.clipboard) {
            return;
        }

        this.model.deselect_all();

        const copied_elements = extended_parse(this.clipboard);

        for (const element of copied_elements) {
            if (element instanceof Gate) {
                for (const output of element.outputs) {
                    output.next_nodes = output.next_nodes.filter(next_node => copied_elements.includes(next_node.parent));

                    for (const segment of output.wire_segments.copy()) {
                        if (segment.offset_pos &&
                            segment.normal_pos &&
                            !segment.is_connected_to(output) &&
                            !output.next_nodes.find(node => segment.is_connected_to(node))
                        ) {
                            this.model.remove_wire_branch(segment);
                        }
                    }
                }
            }
        }

        const main_elements = copied_elements.filter(element => element instanceof Gate || element instanceof Label);
        const offset = Vec.sub(Vec.round(this.mouse_world_pos), bounding_rect(main_elements).pos);

        const elements = this.model.elements(copied_elements);

        this.model.update_all_last_pos(elements);

        for (const element of elements) {
            this.model.add(element);

            if (element instanceof ConnectionNode == false) {
                element.move(offset);
            }

            this.model.select(element);
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

    view_content() {
        const custom_gate = this.model.selected_elements_array().find(element => element instanceof CustomGate);

        if (custom_gate) {
            this.save_state('view content');

            this.model.main_gate = new CustomGate;
            this.model.main_gate.inner_elements = deep_copy(custom_gate.inner_elements);
        }
    }

    change_element(element) {
        for (const prev_element of this.model.selected_elements_) {
            if (prev_element instanceof Gate ||
                prev_element instanceof Label
            ) {
                const new_element = Object.assign(deep_copy(element), prev_element);
                new_element.tag = element.tag;

                replace_reference(this.model.main_gate, prev_element, new_element);
                replace_reference(prev_element, prev_element, new_element);

                if (element instanceof Gate) {
                    for (const node of new_element.outputs) {
                        this.model.queue_tick(node);
                    }
                }
            }
        }
    }

    init_element(element) {
        element.pos.set(this.mouse_down_world_pos).round();

        if (element instanceof Gate) {
            element.set_nodes_pos();
            element.cancel_animation();
            element.nodes_init_animation();
        }

        if (element instanceof Label) {
            element.cancel_animation();
        }

        this.model.add(element);
    }

    init_custom_gate(gate) {
        this.init_element(gate);

        const inner_elements = gate.inner_elements.sorted((a,b) => a.pos.y==b.pos.y ? a.pos.x-b.pos.x : a.pos.y-b.pos.y);

        for (const inner_element of inner_elements) {
            if (inner_element instanceof InputSwitch ||
                inner_element instanceof InputButton ||
                inner_element instanceof InputPulse ||
                inner_element instanceof Clock
            ) {
                const input = gate.add_input_node();

                input.is_inverted = inner_element.outputs[0].is_inverted;

                input.next_nodes = inner_element.outputs[0].next_nodes;
                inner_element.outputs[0].next_nodes = [];

                if (inner_element instanceof InputPulse) {
                    input.is_rising_edge = true;
                }
            }

            if (inner_element instanceof OutputLight) {
                const output = gate.add_output_node();

                output.is_inverted = inner_element.inputs[0].is_inverted;

                const prev_node = inner_element.inputs[0].previous_node();

                prev_node.next_nodes.remove(inner_element.inputs[0]);
                prev_node.next_nodes.push(output);
            }

            if (inner_element instanceof Label) {
                const special_info = inner_element.special_info();

                if (special_info) {
                    if (special_info.tag) {
                        gate.tag = special_info.tag;
                    }
                    if (special_info.size) {
                        gate.size = special_info.size;
                    }
                }
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
