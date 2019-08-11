'use strict';

class Keybind {
    static parse(string) {
        const keybind = new Keybind;

        keybind.modifiers = {
            ctrl  : string != (string = string.replace(/ctrl\s*\+/gi,  '')),
            shift : string != (string = string.replace(/shift\s*\+/gi, '')),
            alt   : string != (string = string.replace(/alt\s*\+/gi,   '')),
        };

        keybind.key = string.trim();
        if (keybind.key.toLowerCase() == 'space') {
            keybind.key = ' ';
        }

        return keybind;
    }
    static parse_all(string) {
        return string.split(',').map(string => Keybind.parse(string));
    }
    static from_event(event) {
        const keybind = new Keybind;

        keybind.modifiers = {
            ctrl  : event.ctrlKey,
            shift : event.shiftKey,
            alt   : event.altKey,
        };

        keybind.key = event.key;

        return keybind;
    }

    equals(keybind) {
        return this.key.toLowerCase() == keybind.key.toLowerCase()
            && this.modifiers.ctrl  == keybind.modifiers.ctrl
            && this.modifiers.shift == keybind.modifiers.shift
            && this.modifiers.alt   == keybind.modifiers.alt;
    }

    static format(string) {
        return Keybind.parse_all(string).map(keybind => keybind.to_string()).join(', ');
    }
    to_string() {
        let modifier_string = '';

        if (this.modifiers.ctrl)  modifier_string += 'Ctrl+';
        if (this.modifiers.shift) modifier_string += 'Shift+';
        if (this.modifiers.alt)   modifier_string += 'Alt+';

        const key = this.key==' ' ? 'space' : this.key;
        return `${modifier_string}${key.substr(0,1).toUpperCase()}${key.substr(1).toLowerCase()}`;
    }
}

function is_command_enabled(command) {
    switch (command) {
        case 'add_and_gate':
        case 'add_xor_gate':
        case 'add_input_switch':
        case 'add_input_button':
        case 'add_input_pulse':
        case 'add_clock':
        case 'add_not_gate':
        case 'add_or_gate':
        case 'add_output_light':
        case 'add_segment_display':
        case 'add_label':
            return true;

        case 'change_type_and_gate':
        case 'change_type_xor_gate':
        case 'change_type_input_switch':
        case 'change_type_input_button':
        case 'change_type_input_pulse':
        case 'change_type_clock':
        case 'change_type_not_gate':
        case 'change_type_or_gate':
        case 'change_type_output_light':
        case 'change_type_segment_display':
        case 'change_type_text_label':
            return false;

        case 'clear_recent_file_list':
        case 'clear_recently_imported_list':
            return false;

        case 'deselect_all':
            for (const element of cs.context.inner_elements) {
                if (element.is_selected()) {
                    return true;
                }
            }
            return false;

        case 'split_segment':
            for (const element of ActionGet.selected_elements()) {
                if (element instanceof WireSegment) {
                    return true;
                }
            }
            return false;

        case 'view_content':
            for (const element of ActionGet.selected_elements()) {
                if (element instanceof CustomGate) {
                    return true;
                }
            }
            return false;

        case 'add_input_node':
            for (const element of ActionGet.selected_elements()) {
                if (element instanceof Gate && element.allow_new_input_nodes()) {
                    return true;
                }
            }
            return false;
        case 'remove_input_node':
            for (const element of ActionGet.selected_elements()) {
                if (element instanceof Gate && element.allow_new_input_nodes() && element.inputs.some(input => input.is_empty())) {
                    return true;
                }
            }
            return false;

        case 'invert':
            for (const element of ActionGet.selected_elements()) {
                if (element instanceof ConnectionNode) {
                    return true;
                }
            }
            return false;

        case 'debug_tick':
        case 'debug_single_tick':
        case 'debug_resume':
            return !cs.controller.tick_nodes;
        case 'debug_pause':
            return cs.controller.tick_nodes;
        case 'debug_toggle':
        case 'debug_close':
            return true;

        case 'undo':
            return !!cs.controller.undo_stack.length;
        case 'redo':
            return !!cs.controller.redo_stack.length;

        case 'copy':
        case 'cut':
        case 'delete':
            return !!ActionGet.selected_elements().length;
        case 'paste':
            return !!cs.controller.clipboard;
    }

    return true;
}

const commands = {
    open_settings() {
        Settings.show();
    },
    add_and_gate() {
        cs.controller.save_state('(command) add_and_gate');
        cs.controller.add_element(new AndGate);
    },
    add_xor_gate() {
        cs.controller.save_state('(command) add_xor_gate');
        cs.controller.add_element(new XorGate);
    },
    add_input_node() {
        cs.controller.save_state('(command) add_input_node');
        ActionUtil.add_input_node_to_selected();
    },
    remove_input_node() {
        cs.controller.save_state('(command) remove_input_node');
        ActionUtil.remove_input_node_from_selected();
    },
    add_input_switch() {
        cs.controller.save_state('(command) add_input_switch');
        cs.controller.add_element(new InputSwitch);
    },
    add_input_button() {
        cs.controller.save_state('(command) add_input_button');
        cs.controller.add_element(new InputButton);
    },
    add_input_pulse() {
        cs.controller.save_state('(command) add_input_pulse');
        cs.controller.add_element(new InputPulse);
    },
    add_clock() {
        cs.controller.save_state('(command) add_clock');
        cs.controller.add_element(new Clock);
    },
    add_not_gate() {
        cs.controller.save_state('(command) add_not_gate');
        let nop_gate = new NopGate;
        cs.controller.add_element(nop_gate);

        ActionUtil.queue_tick_for(nop_gate.outputs);
    },
    add_or_gate() {
        cs.controller.save_state('(command) add_or_gate');
        cs.controller.add_element(new OrGate);
    },
    add_output_light() {
        cs.controller.save_state('(command) add_output_light');
        cs.controller.add_element(new OutputLight);
    },
    add_segment_display() {
        cs.controller.save_state('(command) add_segment_display');
        cs.controller.add_element(new SegmentDisplay);
    },
    add_label() {
        cs.controller.save_state('(command) add_label');
        const label = new Label;
        label.text = 'Text...';
        cs.controller.add_element(label);
    },
    change_type_and_gate() {
        cs.controller.save_state('(command) change_type_and_gate');
        cs.controller.change_element(new AndGate);
    },
    change_type_xor_gate() {
        cs.controller.save_state('(command) change_type_xor_gate');
        cs.controller.change_element(new XorGate);
    },
    change_type_input_switch() {
        cs.controller.save_state('(command) change_type_input_switch');
        cs.controller.change_element(new InputSwitch);
    },
    change_type_input_button() {
        cs.controller.save_state('(command) change_type_input_button');
        cs.controller.change_element(new InputButton);
    },
    change_type_input_pulse() {
        cs.controller.save_state('(command) change_type_input_pulse');
        cs.controller.change_element(new InputPulse);
    },
    change_type_clock() {
        cs.controller.save_state('(command) change_type_clock');
        cs.controller.change_element(new Clock);
    },
    change_type_not_gate() {
        cs.controller.save_state('(command) change_type_not_gate');
        let nop_gate = new NopGate;
        nop_gate.outputs[0].is_inverted = true;
        cs.controller.change_element(nop_gate);
    },
    change_type_or_gate() {
        cs.controller.save_state('(command) change_type_or_gate');
        cs.controller.change_element(new OrGate);
    },
    change_type_output_light() {
        cs.controller.save_state('(command) change_type_output_light');
        cs.controller.change_element(new OutputLight);
    },
    change_type_segment_display() {
        cs.controller.save_state('(command) change_type_segment_display');
        cs.controller.change_element(new SegmentDisplay);
    },
    change_type_text_label() {
        cs.controller.save_state('(command) change_type_text_label');
        cs.controller.change_element(new Label);
    },
    clear_recent_file_list() {
    },
    clear_recently_imported_list() {
    },
    view_content() {
        cs.controller.view_content();
    },
    copy() {
        cs.controller.copy();
    },
    cut() {
        cs.controller.save_state('(command) cut');
        cs.controller.copy();
        ActionUtil.remove_selected();
    },
    delete() {
        cs.controller.save_state('(command) delete');
        cs.controller.current_action = Enum.action.none;
        ActionUtil.remove_selected();
    },
    escape() {
        Menu.close();
        commands.debug_close();

        switch (cs.controller.current_action) {
            case Enum.action.move_elements:
                if (cs.controller.imported_group) {
                    for (const element of cs.controller.imported_group.elements) {
                        Action.remove(element);
                    }
                }
                else {
                    for (const element of cs.controller.moving_elements) {
                        if (element.last_pos_) {
                            element.pos = element.last_pos_.copy();
                        }
                    }
                }
                break;

            case Enum.action.rewire_input:
            case Enum.action.rewire_output:
            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
                Util.load_snapshot();
                cs.controller.new_wire_segments = [];
                break;

            case Enum.action.resize_elements:
                for (const element of ActionGet.selected_elements()) {
                    if (element.last_size_) {
                        element.size = Vec.copy(element.last_size_);
                    }
                }
                break;
        }

        ActionUtil.deselect_all();
        cs.controller.current_action = Enum.action.none;

        load_end();
    },
    enter() {
        ActionUtil.deselect_all();
        cs.controller.current_action = Enum.action.none;
    },
    toggle_fullscreen() {
        if (document.fullscreen) {
            document.exitFullscreen();
        }
        else if (cs.config.hide_ui_in_fullscreen) {
            canvas.requestFullscreen();
        }
        else {
            document.body.requestFullscreen();
        }
    },
    toggle_sidebar() {
        Menu.show_sidebar(!Menu.sidebar_open);
    },
    import() {
        cs.controller.save_state('(command) import');
        cs.controller.read_files(function(result) {
            cs.controller.add_custom_gate(Util.extended_parse(result));
            ActionUtil.queue_tick_all();
        });
    },
    instant_import() {
        const file_string = cs.controller.file_string();
        cs.controller.add_custom_gate(Util.extended_parse(file_string));
        ActionUtil.queue_tick_all();
    },
    invert() {
        cs.controller.save_state('(command) invert');
        ActionUtil.invert_selected_nodes();
    },
    new() {
        cs.config.current_file = null;
        View.update_title();

        cs.controller.save_state('(command) new');
        cs.controller.reset();
    },
    open_file() {
        cs.controller.read_files(function(result) {
            cs.context = Util.extended_parse(result);
            ActionUtil.queue_tick_all();
        });
    },
    reset_sidebar() {
        cs.sidebar.load_categories();
    },
    add_sidebar_elements_as_file() {
        commands.add_sidebar_elements(true);
    },
    add_sidebar_elements(as_file=false) {
        cs.controller.read_files(function(result, file) {
            const file_path = file.webkitRelativePath.split('/');

            if (!file_path.at(-1).endsWith('.circ')) {
                console.warn(`Failed to add file to sidebar: unknown file type '${file_path.at(-1)}'.`);
                return;
            }

            const header = file_path.at(-2);

            let category = cs.sidebar.categories.find(category => category.header==header);
            if (!category) {
                cs.sidebar.categories.push(category = {header, groups:[]});
            }

            let element

            try {
                element = Util.extended_parse(result);
            }
            catch {}

            if (!element) {
                console.warn(`Failed to add file to sidebar: error while parsing.`);
                return;
            }

            if (element instanceof CustomGate == false) {
                console.warn(`Failed to add file to sidebar: parsed file is not a CustomGate.`);
                return;
            }

            if (as_file) {
                category.groups.push({elements: element.inner_elements});
            }
            else {
                Util.convert_to_custom_gate(element);
                category.groups.push({elements: [element]});
            }

            cs.sidebar.update();
        }, true);
    },
    paste() {
        cs.controller.save_state('(command) paste');
        cs.controller.paste();
    },
    undo() {
        cs.controller.undo();
    },
    redo() {
        cs.controller.redo();
    },
    reopen_last_file() {
    },
    reset_view() {
        cs.controller.reset_view();
    },
    zoom_to_selection() {
        const elements = ActionGet.selected_elements().length ? ActionGet.selected_elements() : ActionGet.elements();

        if (!elements.length) {
            return;
        }

        const bounding_rect = Util.bounding_rect(elements);
        const selection_center = Vec.div(bounding_rect.size, 2).add(bounding_rect.pos);

        const camera_scale = Math.min(canvas.width/bounding_rect.size.x, canvas.height/bounding_rect.size.y);
        cs.camera.scale = Math.min(camera_scale*.9, 42);

        const camera_pos = Vec
            .sub(
                cs.camera.to_screenspace(selection_center),
                cs.camera.to_screenspace(new Vec),
            )
            .mult(-1)
            .add(View.screen_center());
        cs.camera.pos.set(camera_pos);
    },
    save(save_as=false) {
        if (!cs.config.current_file) {
            cs.config.current_file = {};
        }

        if (!cs.config.current_file.name || save_as) {
            let file_name = prompt('Save file as...', cs.config.current_file.name||'file.circ');

            if (file_name === undefined) {
                return false;
            }
            if (!file_name) {
                file_name = 'file.circ';
            }
            if (!file_name.endsWith('.circ')) {
                file_name = `${file_name}.circ`;
            }

            cs.config.current_file.name = file_name;

            View.update_title();
        }

        cs.config.current_file.content = cs.controller.file_string();

        Util.download_string(cs.config.current_file.content, cs.config.current_file.name);

        return true;
    },
    save_as() {
        commands.save(true);
    },
    select_all() {
        ActionUtil.select_all();
    },
    toggle_selection() {
        if (ActionGet.elements().every(element => element.is_selected())) {
            ActionUtil.deselect_all();
        }
        else {
            ActionUtil.select_all();
        }
    },
    deselect_all() {
        ActionUtil.deselect_all();
    },
    split_segment() {
        cs.controller.save_state('(command) split_segment');
        ActionUtil.split_selected_segments();
    },
    zoom_in() {
        cs.camera.scale_at(View.screen_center(), cs.config.scale_factor);
    },
    zoom_out() {
        cs.camera.scale_at(View.screen_center(), 1/cs.config.scale_factor);
    },

    debug_toggle() {
        cs.controller.tick_nodes = true;
        Menu.show_debugger(!Menu.debugger_visible);
    },
    debug_close() {
        cs.controller.tick_nodes = true;
        Menu.show_debugger(false);
    },
    debug_pause() {
        cs.controller.tick_nodes = false;
        Menu.show_debugger(true);
    },
    debug_resume() {
        cs.controller.tick_nodes = true;
        Menu.show_debugger(true);
    },
    debug_pause_resume() {
        cs.controller.tick_nodes = !cs.controller.tick_nodes;
        Menu.show_debugger(true);
    },
    debug_tick() {
        Action.tick();
        Menu.show_debugger(true);
    },
    debug_single_tick() {
        Action.tick();
        Menu.show_debugger(true);
    },

    reset_setting() {
        Settings.reset_current_setting();
    },
    record_keybind() {
        Settings.record_current_keybind();
    },
};
