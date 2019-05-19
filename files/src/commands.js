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

    get_string() {
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
            current_tab.controller.init_element(new AndGate);
        },
    },
    {
        name: 'add-input-node',
        shortcuts: [new KeyCombination(187, '+', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        command: function() {
            for (const element of current_tab.model.selected_elements) {
                if (element instanceof Gate) {
                    element.inputs.push(new InputNode(element));
                }
            }
        },
    },
    {
        name: 'add-input-switch',
        shortcuts: [],
        command: function() {
            current_tab.controller.init_element(new InputSwitch);
        },
    },
    {
        name: 'add-not-gate',
        shortcuts: [],
        command: function() {
            let nop_gate = new NopGate;
            current_tab.controller.init_element(nop_gate);

            nop_gate.outputs[0].is_inverted = true;
        },
    },
    {
        name: 'add-or-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.init_element(new OrGate);
        },
    },
    {
        name: 'add-output-light',
        shortcuts: [],
        command: function() {
            current_tab.controller.init_element(new OutputLight);
        },
    },
    {
        name: 'add-segment-display',
        shortcuts: [],
        command: function() {
            current_tab.controller.init_element(new SegmentDisplay);
        },
    },
    {
        name: 'add-text-label',
        shortcuts: [],
        command: function() {
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
        name: 'copy',
        shortcuts: [new KeyCombination(67, 'c', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.copy_selected_elements();
        },
    },
    {
        name: 'cut',
        shortcuts: [new KeyCombination(88, 'x', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.copy_selected_elements();
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'delete',
        shortcuts: [new KeyCombination(46, 'delete', KeyCombination.Modifier_None)],
        command: function() {
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'escape',
        shortcuts: [new KeyCombination(27, 'escape', KeyCombination.Modifier_None)],
        command: function() {
            close_menu();
            current_tab.model.deselect_all();
        },
    },
    {
        name: 'exit',
        shortcuts: [],
        command: function() {
            close();
        },
    },
    {
        name: 'grid-dots',
        shortcuts: [],
        command: function() {
            config.grid_style = grid_style.dots;
        },
    },
    {
        name: 'grid-none',
        shortcuts: [],
        command: function() {
            config.grid_style = grid_style.none;
        },
    },
    {
        name: 'grid-lines',
        shortcuts: [],
        command: function() {
            config.grid_style = grid_style.lines;
        },
    },
    {
        name: 'import',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.read_files(function(result) {
                current_tab.controller.create_custom_gate(extended_parse(result));
                current_tab.model.tick_all();
            });
        },
    },
    {
        name: 'invert',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.model.invert_selected_connection_nodes();
        },
    },
    {
        name: 'new',
        shortcuts: [new KeyCombination(78, 'n', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.reset();
            current_tab.reset_view();
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
        shortcuts: [new KeyCombination(79, 'o', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        command: function() {
        },
    },
    {
        name: 'paste',
        shortcuts: [new KeyCombination(86, 'v', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.paste_copied_elements();
        },
    },
    {
        name: 'redo',
        shortcuts: [
            new KeyCombination(90, 'z', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift),
            new KeyCombination(89, 'y', KeyCombination.Modifier_Ctrl),
        ],
        command: function() {
        },
    },
    {
        name: 'reload',
        shortcuts: [new KeyCombination(82, 'r', KeyCombination.Modifier_Ctrl)],
        command: function() {
            const file_string = current_tab.controller.get_file_string();
            current_tab.reset();
            current_tab.model.main_gate = extended_parse(file_string);
        },
    },
    {
        name: 'reopen-last-file',
        shortcuts: [new KeyCombination(84, 't', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
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
            download_string(current_tab.controller.get_file_string(), 'file.circ');
        },
    },
    {
        name: 'save-as',
        shortcuts: [new KeyCombination(83, 's', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        command: function() {
            let file_name = prompt('Save file as...', 'file.circ');
            if (file_name) {
                file_name = file_name.endsWith('.circ') ? file_name : `${file_name}.circ`;
                download_string(current_tab.controller.get_file_string(), file_name);
            }
        },
    },
    {
        name: 'select-all',
        shortcuts: [new KeyCombination(65, 'a', KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.model.select_all();
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
        name: 'undo',
        shortcuts: [new KeyCombination(90, 'z', KeyCombination.Modifier_Ctrl)],
        command: function() {
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
