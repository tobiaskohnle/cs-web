'use strict';

class KeyCombination {
    constructor(key_code, key, modifier_keys) {
        this.key = key;
        this.key_code = key_code;
        this.modifier_keys = modifier_keys;
    }

    matches_event(event) {
        if (event.ctrlKey  == !(this.modifier_keys & KeyCombination.Modifier_Ctrl))  return false;
        if (event.shiftKey == !(this.modifier_keys & KeyCombination.Modifier_Shift)) return false;
        if (event.altKey   == !(this.modifier_keys & KeyCombination.Modifier_Alt))   return false;

        return this.key_code == event.keyCode;
    }

    to_string() {
        let modifier_string = '';

        if (this.modifier_keys & KeyCombination.Modifier_Ctrl)  modifier_string += 'Ctrl+';
        if (this.modifier_keys & KeyCombination.Modifier_Shift) modifier_string += 'Shift+';
        if (this.modifier_keys & KeyCombination.Modifier_Alt)   modifier_string += 'Alt+';

        return `${modifier_string}${this.key.substr(0,1).toUpperCase()}${this.key.substr(1).toLowerCase()}`;
    }

    static get Modifier_None() {
        return 0x0;
    }
    static get Modifier_Shift() {
        return 0x1;
    }
    static get Modifier_Ctrl() {
        return 0x2;
    }
    static get Modifier_Alt() {
        return 0x4;
    }
}

const commands = [
    {
        name: 'add-and-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-and-gate');
            current_tab.controller.init_element(new AndGate);
        },
    },
    {
        name: 'add-input-node',
        shortcuts: [new KeyCombination(187, '+', KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.controller.save_state('(command) add-input-node');
            current_tab.model.add_input_node_to_selected_gates();
        },
    },
    {
        name: 'add-input-switch',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-input-switch');
            current_tab.controller.init_element(new InputSwitch);
        },
    },
    {
        name: 'add-input-button',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-input-button');
            current_tab.controller.init_element(new InputButton);
        },
    },
    {
        name: 'add-input-pulse',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-input-pulse');
            current_tab.controller.init_element(new InputPulse);
        },
    },
    {
        name: 'add-clock',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-clock');
            current_tab.controller.init_element(new Clock);
        },
    },
    {
        name: 'add-not-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-not-gate');
            let nop_gate = new NopGate;
            current_tab.controller.init_element(nop_gate);

            nop_gate.outputs[0].is_inverted = true;
        },
    },
    {
        name: 'add-or-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-or-gate');
            current_tab.controller.init_element(new OrGate);
        },
    },
    {
        name: 'add-output-light',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-output-light');
            current_tab.controller.init_element(new OutputLight);
        },
    },
    {
        name: 'add-segment-display',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-segment-display');
            current_tab.controller.init_element(new SegmentDisplay);
        },
    },
    {
        name: 'add-text-label',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-text-label');
            current_tab.controller.init_element(new Label);
        },
    },
    {
        name: 'change-type-and-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-and-gate');
            current_tab.controller.change_element(new AndGate);
        },
    },
    {
        name: 'change-type-input-switch',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-input-switch');
            current_tab.controller.change_element(new InputSwitch);
        },
    },
    {
        name: 'change-type-input-button',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-input-button');
            current_tab.controller.change_element(new InputButton);
        },
    },
    {
        name: 'change-type-input-pulse',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-input-pulse');
            current_tab.controller.change_element(new InputPulse);
        },
    },
    {
        name: 'change-type-clock',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-clock');
            current_tab.controller.change_element(new Clock);
        },
    },
    {
        name: 'change-type-not-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-not-gate');
            let nop_gate = new NopGate;
            nop_gate.outputs[0].is_inverted = true;

            current_tab.controller.change_element(nop_gate);
        },
    },
    {
        name: 'change-type-or-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-or-gate');
            current_tab.controller.change_element(new OrGate);
        },
    },
    {
        name: 'change-type-output-light',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-output-light');
            current_tab.controller.change_element(new OutputLight);
        },
    },
    {
        name: 'change-type-segment-display',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-segment-display');
            current_tab.controller.change_element(new SegmentDisplay);
        },
    },
    {
        name: 'change-type-text-label',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-text-label');
            current_tab.controller.change_element(new Label);
        },
    },
    {
        name: 'clear-recent-file-list',
        shortcuts: [],
        command: function() {
        },
    },
    {
        name: 'clear-recently-imported-list',
        shortcuts: [],
        command: function() {
        },
    },
    {
        name: 'view-content',
        shortcuts: [],
        command: function() {
            current_tab.controller.view_content();
        },
    },
    {
        name: 'copy',
        shortcuts: [new KeyCombination(67, 'c', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.copy();
        },
    },
    {
        name: 'cut',
        shortcuts: [new KeyCombination(88, 'x', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) cut');
            current_tab.controller.copy();
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'delete',
        shortcuts: [new KeyCombination(46, 'delete', KeyCombination.Modifier_None)],
        command: function() {
            current_tab.controller.save_state('(command) delete');
            current_tab.controller.current_action = Enum.action.none;
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'escape',
        shortcuts: [new KeyCombination(27, 'escape', KeyCombination.Modifier_None)],
        command: function() {
            close_menu();

            switch (current_tab.controller.current_action) {
                case Enum.action.import_element:
                    current_tab.model.delete(current_tab.controller.imported_element);
                    break;
                case Enum.action.create_wire:
                case Enum.action.create_wire_segment:
                    current_tab.load_snapshot();
                    break;
            }

            current_tab.model.deselect_all();
            current_tab.controller.current_action = Enum.action.none;
        },
    },
    {
        name: 'enter',
        shortcuts: [new KeyCombination(13, 'enter', KeyCombination.Modifier_None)],
        command: function() {
            current_tab.controller.current_action = Enum.action.none;
        },
    },
    {
        name: 'grid-dots',
        shortcuts: [],
        command: function() {
            config.grid_style = Enum.grid_style.dots;
        },
    },
    {
        name: 'grid-none',
        shortcuts: [],
        command: function() {
            config.grid_style = Enum.grid_style.none;
        },
    },
    {
        name: 'grid-lines',
        shortcuts: [],
        command: function() {
            config.grid_style = Enum.grid_style.lines;
        },
    },
    {
        name: 'import',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) import');
            current_tab.controller.read_files(function(result) {
                current_tab.controller.init_custom_gate(extended_parse(result));
                current_tab.model.tick_all();
            });
        },
    },
    {
        name: 'instant-import',
        shortcuts: [new KeyCombination(76, 'l', KeyCombination.Modifier_Ctrl)],
        command: function() {
            const file_string = current_tab.controller.file_string();
            current_tab.controller.init_custom_gate(extended_parse(file_string));
            current_tab.model.tick_all();
        },
    },
    {
        name: 'invert',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.controller.save_state('(command) invert');
            current_tab.model.invert_selected_connection_nodes();
        },
    },
    {
        name: 'new',
        shortcuts: [new KeyCombination(78, 'n', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) new');
            current_tab.reset();
            current_tab.camera.reset();
        },
    },
    {
        name: 'open-file',
        shortcuts: [new KeyCombination(79, 'o', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.read_files(function(result) {
                current_tab.model.main_gate = extended_parse(result);
                current_tab.model.tick_all();
            });
        },
    },
    {
        name: 'open-folder',
        shortcuts: [new KeyCombination(79, 'o', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
        },
    },
    {
        name: 'paste',
        shortcuts: [new KeyCombination(86, 'v', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) paste');
            current_tab.controller.paste();
        },
    },
    {
        name: 'undo',
        shortcuts: [new KeyCombination(90, 'z', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.undo();
        },
    },
    {
        name: 'redo',
        shortcuts: [
            new KeyCombination(90, 'z', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl),
            new KeyCombination(89, 'y', KeyCombination.Modifier_Ctrl),
        ],
        command: function() {
            current_tab.controller.redo();
        },
    },
    {
        name: 'TEMP-SAVE-STATE',
        shortcuts: [
            new KeyCombination(83, 's', KeyCombination.Modifier_None),
        ],
        command: function() {
            current_tab.controller.save_state('COMMAND');
        },
    },
    {
        name: 'TEMP-RELOAD',
        shortcuts: [new KeyCombination(82, 'r', KeyCombination.Modifier_None)],
        command: function() {
            localStorage.setItem('CS-RESTORE-ON-STARTUP', current_tab.controller.file_string());
            location.reload();
        },
    },
    {
        name: 'reopen-last-file',
        shortcuts: [new KeyCombination(84, 't', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
        },
    },
    {
        name: 'reset-view',
        shortcuts: [],
        command: function() {
            current_tab.controller.reset_view();
        },
    },
    {
        name: 'save',
        shortcuts: [new KeyCombination(83, 's', KeyCombination.Modifier_Ctrl)],
        command: function() {
            download_string(current_tab.controller.file_string(), 'file.circ');
        },
    },
    {
        name: 'save-as',
        shortcuts: [new KeyCombination(83, 's', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
            let file_name = prompt('Save file as...', 'file.circ');
            if (file_name) {
                file_name = file_name.endsWith('.circ') ? file_name : `${file_name}.circ`;
                download_string(current_tab.controller.file_string(), file_name);
            }
        },
    },
    {
        name: 'select-all',
        shortcuts: [new KeyCombination(65, 'a', KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.model.select_all();
        },
    },
    {
        name: 'next-vertical-align',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) next-vertical-align');
            for (const element of current_tab.model.selected_elements_) {
                if (element instanceof Label) {
                    element.next_vertical_align();
                }
            }
        },
    },
    {
        name: 'next-horizontal-align',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) next-horizontal-align');
            for (const element of current_tab.model.selected_elements_) {
                if (element instanceof Label) {
                    element.next_horizontal_align();
                }
            }
        },
    },
    {
        name: 'toggle-selection',
        shortcuts: [new KeyCombination(65, 'a', KeyCombination.Modifier_Ctrl)],
        command: function() {
            if (current_tab.model.elements().every(element => element.is_selected())) {
                current_tab.model.deselect_all();
            }
            else {
                current_tab.model.select_all();
            }
        },
    },
    {
        name: 'deselect-all',
        shortcuts: [new KeyCombination(65, 'a', KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.model.deselect_all();
        },
    },
    {
        name: 'split-segment',
        shortcuts: [new KeyCombination(65, 'g', KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.controller.save_state('(command) split-segment');
            current_tab.model.split_selected_segments();
        },
    },
    {
        name: 'theme-dark',
        shortcuts: [],
        command: function() {
            select_theme(theme.dark);
        },
    },
    {
        name: 'theme-light',
        shortcuts: [],
        command: function() {
            select_theme(theme.light);
        },
    },
    {
        name: 'zoom-in',
        shortcuts: [new KeyCombination(187, '+', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.camera.scale_at(screen_center(), config.scale_factor);
        },
    },
    {
        name: 'zoom-out',
        shortcuts: [new KeyCombination(189, '-', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.camera.scale_at(screen_center(), 1/config.scale_factor);
        },
    },
];
