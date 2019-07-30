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

        return keybind;
    }
    static parse_all(string) {
        return string.split(',').map(string => Keybind.parse(string));
    }

    matches_event(event) {
        if (event.ctrlKey  != this.modifiers.ctrl)  return false;
        if (event.shiftKey != this.modifiers.shift) return false;
        if (event.altKey   != this.modifiers.alt)   return false;

        return this.key.toLowerCase() == event.key.toLowerCase();
    }

    to_string() {
        let modifier_string = '';

        if (this.modifiers.ctrl)  modifier_string += 'Ctrl+';
        if (this.modifiers.shift) modifier_string += 'Shift+';
        if (this.modifiers.alt)   modifier_string += 'Alt+';

        return `${modifier_string}${this.key}`;
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

        case 'debug_toggle':
        case 'debug_step':
        case 'debug_single_step':
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
    open_settings: function() {
        Settings.show();
    },
    add_and_gate: function() {
        cs.controller.save_state('(command) add_and_gate');
        cs.controller.add_element(new AndGate);
    },
    add_xor_gate: function() {
        cs.controller.save_state('(command) add_xor_gate');
        cs.controller.add_element(new XorGate);
    },
    add_input_node: function() {
        cs.controller.save_state('(command) add_input_node');
        ActionUtil.add_input_node_to_selected();
    },
    remove_input_node: function() {
        cs.controller.save_state('(command) remove_input_node');
        ActionUtil.remove_input_node_from_selected();
    },
    add_input_switch: function() {
        cs.controller.save_state('(command) add_input_switch');
        cs.controller.add_element(new InputSwitch);
    },
    add_input_button: function() {
        cs.controller.save_state('(command) add_input_button');
        cs.controller.add_element(new InputButton);
    },
    add_input_pulse: function() {
        cs.controller.save_state('(command) add_input_pulse');
        cs.controller.add_element(new InputPulse);
    },
    add_clock: function() {
        cs.controller.save_state('(command) add_clock');
        cs.controller.add_element(new Clock);
    },
    add_not_gate: function() {
        cs.controller.save_state('(command) add_not_gate');
        let nop_gate = new NopGate;
        cs.controller.add_element(nop_gate);

        ActionUtil.queue_tick_for(nop_gate.outputs);
    },
    add_or_gate: function() {
        cs.controller.save_state('(command) add_or_gate');
        cs.controller.add_element(new OrGate);
    },
    add_output_light: function() {
        cs.controller.save_state('(command) add_output_light');
        cs.controller.add_element(new OutputLight);
    },
    add_segment_display: function() {
        cs.controller.save_state('(command) add_segment_display');
        cs.controller.add_element(new SegmentDisplay);
    },
    add_label: function() {
        cs.controller.save_state('(command) add_label');
        const label = new Label;
        label.text = 'Text...';
        cs.controller.add_element(label);
    },
    change_type_and_gate: function() {
        cs.controller.save_state('(command) change_type_and_gate');
        cs.controller.change_element(new AndGate);
    },
    change_type_xor_gate: function() {
        cs.controller.save_state('(command) change_type_xor_gate');
        cs.controller.change_element(new XorGate);
    },
    change_type_input_switch: function() {
        cs.controller.save_state('(command) change_type_input_switch');
        cs.controller.change_element(new InputSwitch);
    },
    change_type_input_button: function() {
        cs.controller.save_state('(command) change_type_input_button');
        cs.controller.change_element(new InputButton);
    },
    change_type_input_pulse: function() {
        cs.controller.save_state('(command) change_type_input_pulse');
        cs.controller.change_element(new InputPulse);
    },
    change_type_clock: function() {
        cs.controller.save_state('(command) change_type_clock');
        cs.controller.change_element(new Clock);
    },
    change_type_not_gate: function() {
        cs.controller.save_state('(command) change_type_not_gate');
        let nop_gate = new NopGate;
        nop_gate.outputs[0].is_inverted = true;
        cs.controller.change_element(nop_gate);
    },
    change_type_or_gate: function() {
        cs.controller.save_state('(command) change_type_or_gate');
        cs.controller.change_element(new OrGate);
    },
    change_type_output_light: function() {
        cs.controller.save_state('(command) change_type_output_light');
        cs.controller.change_element(new OutputLight);
    },
    change_type_segment_display: function() {
        cs.controller.save_state('(command) change_type_segment_display');
        cs.controller.change_element(new SegmentDisplay);
    },
    change_type_text_label: function() {
        cs.controller.save_state('(command) change_type_text_label');
        cs.controller.change_element(new Label);
    },
    clear_recent_file_list: function() {
    },
    clear_recently_imported_list: function() {
    },
    view_content: function() {
        cs.controller.view_content();
    },
    copy: function() {
        cs.controller.copy();
    },
    cut: function() {
        cs.controller.save_state('(command) cut');
        cs.controller.copy();
        ActionUtil.remove_selected();
    },
    delete: function() {
        cs.controller.save_state('(command) delete');
        cs.controller.current_action = Enum.action.none;
        ActionUtil.remove_selected();
    },
    escape: function() {
        Menu.close();

        switch (cs.controller.current_action) {
            case Enum.action.import_element:
                Action.remove(cs.controller.imported_element);
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
    },
    enter: function() {
        ActionUtil.deselect_all();
        cs.controller.current_action = Enum.action.none;
    },
    toggle_fullscreen: function() {
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
    toggle_sidebar: function() {
        Menu.show_sidebar(!Menu.sidebar_open);
    },
    grid_dots: function() {
        cs.config.grid_style = Enum.grid_style.dots;
    },
    grid_none: function() {
        cs.config.grid_style = Enum.grid_style.none;
    },
    grid_lines: function() {
        cs.config.grid_style = Enum.grid_style.lines;
    },
    import: function() {
        cs.controller.save_state('(command) import');
        cs.controller.read_files(function(result) {
            cs.controller.add_custom_gate(Util.extended_parse(result));
            ActionUtil.queue_tick_all();
        });
    },
    instant_import: function() {
        const file_string = cs.controller.file_string();
        cs.controller.add_custom_gate(Util.extended_parse(file_string));
        ActionUtil.queue_tick_all();
    },
    invert: function() {
        cs.controller.save_state('(command) invert');
        ActionUtil.invert_selected_nodes();
    },
    new: function() {
        cs.config.current_file = null;
        View.update_title();

        cs.controller.save_state('(command) new');
        cs.controller.reset();
    },
    open_file: function() {
        cs.controller.read_files(function(result) {
            cs.context = Util.extended_parse(result);
            ActionUtil.queue_tick_all();
        });
    },
    add_sidebar_elements: function() {
        cs.controller.read_files(function(result, file) {
            const file_path = file.webkitRelativePath.split('/');

            if (!file_path.at(-1).endsWith('.circ')) {
                return;
            }

            const header = file_path.at(-2);

            let category = cs.sidebar.categories.find(category => category.header==header);
            if (!category) {
                cs.sidebar.categories.push(category = {header, elements:[]});
            }

            let element = Util.extended_parse(result);

            if (element instanceof CustomGate) {
                Util.convert_to_custom_gate(element);
            }

            category.elements.push(element);

            cs.sidebar.update_sections();
            cs.sidebar.update_elements();
        }, true);
    },
    paste: function() {
        cs.controller.save_state('(command) paste');
        cs.controller.paste();
    },
    undo: function() {
        cs.controller.undo();
    },
    redo: function() {
        cs.controller.redo();
    },
    reopen_last_file: function() {
    },
    reset_view: function() {
        cs.controller.reset_view();
    },
    zoom_to_selection: function() {
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
    save: function(save_as) {
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

        return true;
    },
    save_as: function() {
        commands.save(true);
    },
    download: function() {
        if (commands.save()) {
            Util.download_string(cs.config.current_file.content, cs.config.current_file.name);
        }
    },
    select_all: function() {
        ActionUtil.select_all();
    },
    toggle_selection: function() {
        if (ActionGet.elements().every(element => element.is_selected())) {
            ActionUtil.deselect_all();
        }
        else {
            ActionUtil.select_all();
        }
    },
    deselect_all: function() {
        ActionUtil.deselect_all();
    },
    split_segment: function() {
        cs.controller.save_state('(command) split_segment');
        ActionUtil.split_selected_segments();
    },
    theme_dark: function() {
        Menu.select_theme('dark');
    },
    theme_light: function() {
        Menu.select_theme('light');
    },
    zoom_in: function() {
        cs.camera.scale_at(View.screen_center(), cs.config.scale_factor);
    },
    zoom_out: function() {
        cs.camera.scale_at(View.screen_center(), 1/cs.config.scale_factor);
    },
    debug_toggle: function() {
        cs.controller.tick_nodes = !cs.controller.tick_nodes;
    },
    debug_step: function() {
        Action.tick();
    },
    debug_single_step: function() {
        Action.tick();
    },

    reset_setting: function() {
        Settings.reset_current_setting();
    },
    record_keybind: function() {
        Settings.record_current_keybind();
    },
};
