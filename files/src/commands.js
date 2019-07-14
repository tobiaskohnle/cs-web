'use strict';

class Keybind {
    static parse(string) {
        const key_combination = new Keybind;

        key_combination.modifiers = {
            ctrl  : string != (string = string.replace(/ctrl\s*\+/gi,  '')),
            shift : string != (string = string.replace(/shift\s*\+/gi, '')),
            alt   : string != (string = string.replace(/alt\s*\+/gi,   '')),
        };

        key_combination.key = string.trim();

        return key_combination;
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
        close_menu();
        Settings.hide();

        switch (cs.controller.current_action) {
            case Enum.action.import_element:
                Action.remove(cs.controller.imported_element);
                break;
            case Enum.action.create_wire:
            case Enum.action.create_wire_segment:
                Util.load_snapshot();
                break;
        }

        ActionUtil.deselect_all();
        cs.controller.current_action = Enum.action.none;
    },
    enter: function() {
        cs.controller.current_action = Enum.action.none;
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
        cs.controller.save_state('(command) new');
        cs.controller.reset();
    },
    open_file: function() {
        cs.controller.read_files(function(result) {
            cs.context = Util.extended_parse(result);
            ActionUtil.queue_tick_all();
        });
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
    TEMP_SAVE_STATE: function() {
        cs.controller.save_state('COMMAND');
    },
    TEMP_RELOAD: function() {
        localStorage.setItem('CS_RESTORE_ON_STARTUP', cs.controller.file_string());
        location.reload();
    },
    reopen_last_file: function() {
    },
    reset_view: function() {
        cs.controller.reset_view();
    },
    save: function() {
        Util.download_string(cs.controller.file_string(), 'file.circ');
    },
    save_as: function() {
        let file_name = prompt('Save file as...', 'file.circ');
        if (file_name) {
            file_name = file_name.endsWith('.circ') ? file_name : `${file_name}.circ`;
            Util.download_string(cs.controller.file_string(), file_name);
        }
    },
    select_all: function() {
        ActionUtil.select_all();
    },
    next_vertical_align: function() {
        cs.controller.save_state('(command) next_vertical_align');
        for (const element of ActionGet.selected_elements()) {
            if (element instanceof Label) {
                element.next_vertical_align();
            }
        }
    },
    next_horizontal_align: function() {
        cs.controller.save_state('(command) next_horizontal_align');
        for (const element of ActionGet.selected_elements()) {
            if (element instanceof Label) {
                element.next_horizontal_align();
            }
        }
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
        select_theme('dark');
    },
    theme_light: function() {
        select_theme('light');
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
};
