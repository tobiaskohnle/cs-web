'use strict';

class Controller {
    constructor() {
        this.mouse_down_pos = new Vec;
        this.mouse_down_world_pos = new Vec;
        this.mouse_pos = new Vec;
        this.mouse_world_pos = new Vec;
        this.snapped_mouse_world_pos = new Vec;
        this.current_action = Enum.action.none;
        this.hovered_element = null;
        this.moving_elements = [];
        this.saved_elements_in_rect = new Set;

        this.wire_start_node = null;
        this.new_wire_segments = [];

        this.undo_stack = [];
        this.redo_stack = [];

        this.tick_nodes = true;
    }

    reset() {
        cs.camera.reset();

        cs.context = new CustomGate;

        cs.ticked_nodes = new Set;
        cs.selected_elements = new Set;

        this.current_action = Enum.action.none;
    }

    key_down(event) {
        Menu.close();

        if (Settings.is_open) {
            return Settings.key_down(event);
        }

        if (this.current_action == Enum.action.edit_labels) {
            let result = true;

            for (const element of ActionGet.selected_elements()) {
                if (element instanceof Label) {
                    if (!element.key_down(event)) {
                        result = false;
                    }
                }
            }

            if (!result) {
                this.any_label_changed = true;
                return result;
            }
        }

        const pressed_keybind = Keybind.from_event(event);

        for (const command in commands) {
            const keybind = cs.config.keybinds[command];

            if (keybind) {
                if (Keybind.parse_all(keybind).some(keybind => keybind.equals(pressed_keybind))) {
                    setTimeout(commands[command]);
                    return false;
                }
            }
        }

        return !cs.config.block_unused_key_combinations;
    }

    mouse_click(event) {
        if (~event.detail & 1) {
            if (this.hovered_element instanceof ConnectionNode) {
                this.hovered_element.invert();
            }

            if (this.hovered_element instanceof WireSegment) {
                this.save_state('split segment');
                Action.split_segment(this.hovered_element);
                this.hovered_element.update_last_pos();
            }
        }

        if (this.hovered_element instanceof Label) {
            if (this.current_action == Enum.action.edit_labels) {
                for (const element of ActionGet.selected_elements()) {
                    if (element instanceof Label) {
                        element.event_mouse_down(event);
                    }
                }
            }
        }
    }

    mouse_down(event) {
        canvas.setPointerCapture(event.pointerId);

        this.mouse_down_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_down_world_pos = cs.camera.to_worldspace(this.mouse_down_pos);

        if (event.button != 0) {
            return;
        }

        if (this.current_action == Enum.action.create_wire || this.current_action == Enum.action.create_wire_segment) {
            return;
        }

        this.elements_moved = false;
        this.elements_resized = false;

        ActionUtil.update_all_last_pos();

        if (!(event.shiftKey || event.ctrlKey) && (!this.hovered_element || !this.hovered_element.is_selected())) {
            ActionUtil.deselect_all();
        }

        if (this.current_action == Enum.action.edit_labels) {
            if (this.any_label_changed) {
                this.save_state('edit label', this.saved_state_edit_labels);
            }
        }

        if (this.hovered_element) {
            if (this.hovered_element instanceof Label) {
                if (this.current_action == Enum.action.edit_labels) {
                    for (const element of ActionGet.selected_elements()) {
                        if (element instanceof Label) {
                            element.event_mouse_down(event);
                        }
                    }
                    return;
                }
                else if (this.hovered_element.is_selected() && !this.resizing) {
                    this.current_action = Enum.action.edit_labels;

                    this.any_label_changed = false;
                    this.saved_state_edit_labels = Util.deep_copy(cs.context);

                    this.hovered_element.event_mouse_move(event);
                    this.hovered_element.event_mouse_down(event);
                    return;
                }
            }

            const was_selected = this.hovered_element.is_selected();

            ActionUtil.set_selected(
                this.hovered_element,
                this.is_selected(was_selected, event.shiftKey, event.ctrlKey),
            );

            if (this.hovered_element instanceof ConnectionNode && !was_selected && !(event.shiftKey || event.ctrlKey || event.altKey)) {
                this.saved_state_create_wire = Util.deep_copy(cs.context);

                this.current_action = Enum.action.start_wire;
                this.wire_start_node = this.hovered_element;
            }
            else {
                this.saved_state_move_elements = Util.deep_copy(cs.context);

                this.is_mouse_down = true;

                this.current_action = Enum.action.move_elements;

                const selected_elements = ActionGet.selected_elements();

                if (selected_elements.every(element => element instanceof ConnectionNode)) {
                    this.moving_elements = selected_elements;
                }
                else {
                    this.moving_elements = selected_elements.filter(element => element instanceof ConnectionNode == false);
                }

                if (cs.config.sticky_labels) {
                    for (const element of this.moving_elements.copy()) {
                        if (element instanceof Gate) {
                            for (const context_element of cs.context.inner_elements) {
                                if (context_element instanceof Label) {
                                    if (this.moving_elements.includes(context_element.nearest_gate())) {
                                        this.moving_elements.push(context_element);
                                    }
                                }
                            }
                        }
                    }
                }

                for (const element of this.moving_elements) {
                    if (element.mouse_down) element.mouse_down();
                }
            }
        }
        else {
            this.current_action = Enum.action.create_selection_box;

            this.saved_selected_elements = ActionGet.selected_elements();
        }

        if (this.resizing) {
            this.saved_state_resize_elements = Util.deep_copy(cs.context);

            this.current_action = Enum.action.resize_elements;

            ActionUtil.update_all_last_size();
        }
    }

    mouse_move(event) {
        const move_vec = new Vec(event.movementX, event.movementY);

        if (event.buttons & -2) {
            cs.camera.move(move_vec);
        }

        this.mouse_pos = new Vec(event.x-canvas.offsetLeft, event.y-canvas.offsetTop);
        this.mouse_world_pos.set(cs.camera.to_worldspace(this.mouse_pos));
        this.snapped_mouse_world_pos.set(Vec.round(this.mouse_world_pos, .5));

        const world_move_vec = Vec.div(move_vec, cs.camera.anim_scale_);

        let filter;
        switch (this.current_action) {
            case Enum.action.rewire_input:
                filter = element => element instanceof InputNode;
                break;
            case Enum.action.rewire_output:
                filter = element => element instanceof OutputNode;
                break;

            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
                filter = element => ActionGet.nodes_connectable(this.wire_start_node, element)
                    || ActionGet.elements_connectable(this.wire_start_node, element);
                break;
        }

        const hovered_element = ActionGet.element_at(this.mouse_world_pos, filter);
        const other_hovered_element = this.hovered_element != hovered_element;

        switch (this.current_action) {
            case Enum.action.none:
            case Enum.action.rewire_input:
            case Enum.action.rewire_output:
            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
            case Enum.action.edit_labels:
                if (other_hovered_element) {
                    this.hovered_element = hovered_element;
                    cs.config.DEBUG_LOG && console.log(`%cnew hovered element: %c${hovered_element && hovered_element.constructor.name}`,
                        'color:#f90',
                        hovered_element ? 'color:#fd4' : 'color:#777',
                    );
                }
                break;
        }


        switch (this.current_action) {
            case Enum.action.none:
                let cursor = '';
                this.resizing = false;

                if (this.hovered_element instanceof Gate || this.hovered_element instanceof Label) {
                    this.resize = {
                        north: Math.abs(this.mouse_world_pos.y - this.hovered_element.pos.y                              ) < .15,
                        south: Math.abs(this.mouse_world_pos.y - this.hovered_element.pos.y - this.hovered_element.size.y) < .15,
                        east:  Math.abs(this.mouse_world_pos.x - this.hovered_element.pos.x - this.hovered_element.size.x) < .15,
                        west:  Math.abs(this.mouse_world_pos.x - this.hovered_element.pos.x                              ) < .15,
                    };

                    cursor =
                        this.resize.east && this.resize.south ? 'se-resize' :
                        this.resize.south && this.resize.west ? 'sw-resize' :
                        this.resize.north && this.resize.east ? 'ne-resize' :
                        this.resize.north && this.resize.west ? 'nw-resize' :
                        this.resize.east                      ? 'e-resize'  :
                        this.resize.south                     ? 's-resize'  :
                        this.resize.north                     ? 'n-resize'  :
                        this.resize.west                      ? 'w-resize'  :
                        '';

                    this.resize_vec = new Vec(
                        this.resize.east  ? 1 : this.resize.west  ? -1 : 0,
                        this.resize.south ? 1 : this.resize.north ? -1 : 0,
                    );

                    this.resizing = this.resize.north || this.resize.south || this.resize.east || this.resize.west;
                }

                if (document.documentElement.style.cursor != cursor) {
                    document.documentElement.style.cursor = cursor;
                }

                break;

            case Enum.action.edit_labels:
                for (const element of ActionGet.selected_elements()) {
                    if (element instanceof Label) {
                        element.event_mouse_move(event);
                    }
                }
                break;

            case Enum.action.start_wire:
                if (Menu.mouse_moved) {
                    if (this.wire_start_node.is_empty()) {
                        this.current_action = Enum.action.create_wire;

                        this.new_wire_segments = [];

                        const segment_a = Util.add_segment(this.new_wire_segments);
                        segment_a.is_vertical = this.wire_start_node.is_vertical();
                        const segment_b = Util.add_segment(this.new_wire_segments);
                        segment_b.auto_offset_ = true;
                        const segment_c = Util.add_segment(this.new_wire_segments);

                        segment_a.set_connected_pos(this.wire_start_node.anchor_pos_);
                        segment_c.set_connected_pos(this.snapped_mouse_world_pos);

                        segment_a.update(true);
                        segment_b.update(true);
                        segment_c.update(true);

                        Util.create_snapshot();
                    }
                    else if (this.wire_start_node instanceof InputNode) {
                        this.current_action = Enum.action.rewire_input;
                        Util.create_snapshot();
                    }
                    else if (this.wire_start_node instanceof OutputNode) {
                        this.current_action = Enum.action.rewire_output;
                        Util.create_snapshot();
                    }
                }
                break;

            case Enum.action.rewire_input:
            case Enum.action.rewire_output:
                if (other_hovered_element) {
                    this.hovered_element = Util.load_snapshot(this.hovered_element);

                    const rewired_segment = this.wire_start_node.attached_wire_segment();

                    if (this.hovered_element) {
                        if (this.hovered_element != this.wire_start_node) {
                            switch (this.current_action) {
                                case Enum.action.rewire_output:
                                    this.hovered_element.wire_segments = this.wire_start_node.wire_segments;
                                    this.wire_start_node.wire_segments = [];

                                    this.hovered_element.next_nodes = this.wire_start_node.next_nodes;
                                    this.wire_start_node.next_nodes = [];

                                    ActionUtil.queue_tick_for(this.hovered_element.next_nodes);
                                    break;

                                case Enum.action.rewire_input:
                                    const previous_node = this.wire_start_node.previous_node();

                                    this.wire_start_node.clear();
                                    Action.connect_nodes(previous_node, this.hovered_element);
                                    break;
                            }

                            rewired_segment.set_connected_pos(this.hovered_element.anchor_pos_);
                        }
                    }
                    else {
                        switch (this.current_action) {
                            case Enum.action.rewire_output:
                                ActionUtil.queue_tick_for(this.wire_start_node.next_nodes);
                                this.wire_start_node.next_nodes = [];

                                this.new_wire_segments = this.wire_start_node.wire_segments;
                                this.wire_start_node.wire_segments = [];
                                break;

                            case Enum.action.rewire_input:
                                this.wire_start_node.clear();
                                break;
                        }

                        rewired_segment.set_connected_pos(this.snapped_mouse_world_pos);
                    }
                }
                break;

            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
                this.new_wire_segments.last().auto_offset_ = false;

                if (other_hovered_element) {
                    this.hovered_element = Util.load_snapshot(this.hovered_element);

                    this.action_successful_create_wire = Action.create_wire(
                        this.new_wire_segments, this.wire_start_node, this.hovered_element,
                        this.current_action == Enum.action.create_wire,
                    );
                }
                break;

            case Enum.action.create_selection_box:
                const selection_size = Vec.sub(this.mouse_down_world_pos, this.mouse_world_pos);
                const elements_in_rect = new Set(ActionGet.elements_in_rect(this.mouse_world_pos, selection_size));

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
                    ActionUtil.set_selected(element, is_selected);
                }
                for (const element of elements_leaving_rect) {
                    const is_selected = this.saved_selected_elements.includes(element);
                    ActionUtil.set_selected(element, is_selected);
                }

                this.saved_elements_in_rect = elements_in_rect;
                break;

            case Enum.action.move_elements:
            case Enum.action.move_elements_remove_mouse_up:
                const mouse_world_movement = Vec.sub(this.mouse_world_pos, this.mouse_down_world_pos);

                const snap_size = ActionUtil.move_elements(this.moving_elements, mouse_world_movement);
                const elements_moved = !mouse_world_movement.round(snap_size).equals(new Vec);
                this.elements_moved = this.elements_moved || elements_moved;

                this.current_action = this.mouse_pos.x<0 || this.mouse_pos.y<0
                    || this.mouse_pos.x>canvas.width || this.mouse_pos.y>canvas.height
                    ? Enum.action.move_elements_remove_mouse_up
                    : Enum.action.move_elements;
                break;

            case Enum.action.import_element:
                this.save_state('import elements');

                ActionUtil.deselect_all();

                for (const element of this.imported_group.elements) {
                    Action.add(element);
                }

                const elements = ActionGet.elements(this.imported_group.elements);

                this.moving_elements = [];
                this.current_action = Enum.action.move_elements;

                const center = Vec.sub(this.mouse_world_pos, Vec.div(this.imported_group.bounds.size, 2));

                for (const element of elements) {
                    element.update(true);

                    if (element.pos) {
                        element.pos.add(center).sub(this.imported_group.bounds.pos).round(element.snap_size_);
                    }

                    if (element instanceof ConnectionNode == false) {
                        this.moving_elements.push(element);
                    }

                    if (element instanceof Gate || element instanceof Label) {
                        Action.select(element);
                    }

                    Action.update_last_pos(element);

                    if (element.pos) {
                        element.pos.add(new Vec(2));
                    }
                }

                this.mouse_down_world_pos.set(this.mouse_world_pos);
                canvas.setPointerCapture(event.pointerId);
                break;

            case Enum.action.resize_elements:
                for (const element of ActionGet.selected_elements()) {
                    if (element.resize && this.resize) {
                        if (element.resize(Vec.sub(this.mouse_world_pos, this.mouse_down_world_pos), this.resize_vec)) {
                            this.elements_resized = true;
                        }
                    }
                }
                break;
        }
    }

    mouse_up(event) {
        if (event.button != 0) {
            if (!Menu.mouse_moved) {
                if (this.hovered_element && !this.hovered_element.is_selected()) {
                    ActionUtil.deselect_all();
                    Action.select(this.hovered_element);
                }
            }
            return;
        }

        this.is_mouse_down = false;

        for (const element of this.moving_elements) {
            if (element.mouse_up) {
                element.mouse_up();
            }
        }

        if (this.elements_moved == false) {
            if (this.hovered_element instanceof InputSwitch) {
                if (!(event.ctrlKey || event.shiftKey)) {
                    this.hovered_element.toggle();
                    ActionUtil.queue_tick_for(this.hovered_element.outputs);
                }
            }
        }

        switch (this.current_action) {
            case Enum.action.edit_labels:
                break;

            case Enum.action.resize_elements:
                ActionUtil.update_all_last_size();

                if (this.elements_resized) {
                    this.save_state('resize element', this.saved_state_resize_elements);
                }

                this.current_action = Enum.action.none;
                break;

            case Enum.action.rewire_input:
            case Enum.action.rewire_output:
                if (!this.hovered_element) {
                    Util.load_snapshot();
                    Action.clear_node(this.wire_start_node);
                }

                this.save_state('rewire', this.saved_state_create_wire);

                this.new_wire_segments = [];
                this.current_action = Enum.action.none;
                break;

            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
                if (this.action_successful_create_wire) {
                    if (this.new_wire_segments.length) {
                        if (this.new_wire_segments.last().offset_pos == this.snapped_mouse_world_pos) {
                            this.new_wire_segments.last().offset_pos = null;
                        }
                        if (this.new_wire_segments.last().normal_pos == this.snapped_mouse_world_pos) {
                            this.new_wire_segments.last().normal_pos = null;
                        }
                    }

                    cs.config.DEBUG_LOG && console.log('create_wire success');
                    this.current_action = Enum.action.none;

                    for (const segment of this.new_wire_segments) {
                        segment.auto_offset_ = false;
                    }
                    this.new_wire_segments = [];

                    if (cs.config.use_wire_restructuring) {
                        Action.restructure_segments();
                    }

                    this.save_state('create wire', this.saved_state_create_wire);
                }
                else if (this.current_action == Enum.action.create_wire) {
                    cs.config.DEBUG_LOG && console.log('create_wire mouse_up');
                    this.current_action = Enum.action.create_wire_segment;

                    this.new_wire_segments = [];

                    const segment_a = Util.add_segment(this.new_wire_segments);
                    segment_a.is_vertical = this.wire_start_node.is_vertical();

                    const segment_b = Util.add_segment(this.new_wire_segments);

                    segment_a.set_connected_pos(this.wire_start_node.anchor_pos_);
                    segment_b.set_connected_pos(this.snapped_mouse_world_pos);

                    segment_a.update(true);
                    segment_b.update(true);

                    Util.create_snapshot();
                }
                else {
                    cs.config.DEBUG_LOG && console.log('create_wire_segment mouse_up');

                    if (this.new_wire_segments.length) {
                        this.new_wire_segments.last().set_connected_pos(null);

                        const segment = Util.add_segment(this.new_wire_segments);
                        segment.set_connected_pos(this.snapped_mouse_world_pos);
                        segment.update(true);

                        Util.create_snapshot();
                    }
                }
                break;

            case Enum.action.move_elements:
                if (this.elements_moved) {
                    this.save_state('moved elements', this.saved_state_move_elements);

                    if (cs.config.use_wire_restructuring) {
                        Action.restructure_segments();
                    }
                }
                this.current_action = Enum.action.none;
                break;

            case Enum.action.move_elements_remove_mouse_up:
                ActionUtil.remove_all(this.moving_elements);
                this.current_action = Enum.action.none;
                break;

            default:
                this.current_action = Enum.action.none;
                break;
        }
    }

    mouse_wheel(event) {
        const scale_factor = event.deltaY < 0 ? cs.config.scale_factor : 1/cs.config.scale_factor;
        cs.camera.scale_at(this.mouse_pos, scale_factor);
    }

    mouse_leave(event) {
        this.hovered_element = null;
    }

    context_menu(event) {
        if (!Menu.mouse_moved) {
            switch (this.current_action) {
                case Enum.action.create_wire:
                case Enum.action.create_wire_segment:
                    Util.load_snapshot();
                    this.new_wire_segments = [];
                    this.current_action = Enum.action.none;
                    break;

                default:
                    Menu.open('context-menu', null, event.x, event.y);
                    break;
            }
        }
    }

    sidebar_mouse_down(event) {
        sidebar_canvas.setPointerCapture(event.pointerId);
        cs.sidebar.mouse_down(event);
    }

    sidebar_mouse_move(event) {
        cs.sidebar.mouse_move(event);
    }

    sidebar_mouse_up(event) {
        cs.sidebar.mouse_up(event);
    }

    sidebar_mouse_wheel(event) {
        cs.sidebar.scroll_by(-Math.sign(event.deltaY) * cs.config.sidebar_scroll_factor);
    }

    sidebar_mouse_leave(event) {
        cs.sidebar.mouse_leave(event);
    }

    sidebar_context_menu(event) {
        if (!Menu.mouse_moved) {
            Menu.open('sidebar-context-menu', null, event.x, event.y);
        }
    }

    save_state(message, state=Util.deep_copy(cs.context)) {
        cs.config.DEBUG_LOG && console.log(`%cSAVE STATE: ${message}`, 'color:#4c4');
        this.undo_stack.push(state);
        this.redo_stack = [];
    }

    undo() {
        if (this.undo_stack.length) {
            this.redo_stack.push(Util.deep_copy(cs.context));
            cs.context = this.undo_stack.pop();
            this.current_action = Enum.action.none;
        }
    }
    redo() {
        if (this.redo_stack.length) {
            this.undo_stack.push(Util.deep_copy(cs.context));
            cs.context = this.redo_stack.pop();
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

    read_files(onload, open_directory=false) {
        const input = document.createElement('input');
        input.type = 'file';

        if (open_directory) {
            input.setAttribute('directory', '');
            input.setAttribute('webkitdirectory', '');
        }

        input.click();

        input.addEventListener('change', function(event) {
            const files = input.files;

            for (const file of files) {
                const reader = new FileReader;

                reader.addEventListener('load', function(event) {
                    onload(reader.result, file);
                });

                reader.readAsText(file);
            }
        });
    }

    copy() {
        this.clipboard = Util.extended_stringify(ActionGet.selected_elements());

        if (cs.config.use_system_clipboard) {
            navigator.clipboard.writeText(this.clipboard);
        }
    }
    paste() {
        const paste = clipboard => {
            if (!clipboard) {
                return;
            }

            ActionUtil.deselect_all();

            const copied_elements = Util.extended_parse(clipboard);

            const main_elements = copied_elements.filter(element => element instanceof Gate || element instanceof Label);
            const offset = Vec.sub(Vec.round(this.mouse_world_pos), Util.bounding_rect(main_elements).pos);

            const elements = ActionGet.elements(copied_elements);

            ActionUtil.update_all_last_pos(elements);
            ActionUtil.queue_tick_for(elements);

            for (const element of elements) {
                Action.add(element);

                if (element instanceof ConnectionNode == false) {
                    element.move(offset);
                }

                Action.select(element);
            }

            for (const element of copied_elements) {
                if (element instanceof Gate) {
                    for (const output of element.outputs) {
                        for (const next_node of output.next_nodes.copy()) {
                            if (!copied_elements.includes(next_node.parent())) {
                                Action.remove(next_node.attached_wire_segment());
                            }
                        }
                    }
                }
            }
        }

        if (cs.config.use_system_clipboard) {
            navigator.clipboard.readText().then(string => paste(string));
        }
        else {
            paste(this.clipboard);
        }
    }

    file_string() {
        return Util.extended_stringify(
            cs.context,
            function(key, value) {
                // if (key.endsWith('_')) return;
                return value;
            },
            2,
        );
    }

    view_content() {
        const custom_gate = ActionGet.selected_elements().find(element => element instanceof CustomGate);

        if (custom_gate) {
            this.save_state('view content');

            cs.context = new CustomGate;
            cs.context.inner_elements = Util.deep_copy(custom_gate.inner_elements);
        }
    }

    change_element(element) {
        for (const prev_element of ActionGet.selected_elements()) {
            if (prev_element instanceof Gate || prev_element instanceof Label) {
                const new_element = Object.assign(Util.deep_copy(element), prev_element);
                new_element.tag = element.tag;

                Util.replace_reference(cs.context, prev_element, new_element);
                Util.replace_reference(prev_element, prev_element, new_element);

                if (element instanceof Gate) {
                    ActionUtil.queue_tick_for(new_element.outputs);
                }
            }
        }
    }

    add_element(element) {
        element.pos.set(this.mouse_down_world_pos).round();
        element.run_init_animation();
        Action.add(element);
    }

    add_custom_gate(gate) {
        Util.convert_to_custom_gate(gate);
        gate.run_init_animation();
        this.add_element(gate);
    }

    reset_view() {
        cs.camera.reset();
    }
}
