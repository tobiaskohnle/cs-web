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

const actions = [
    {
        name: 'add-and-gate',
        shortcuts: [],
        action: function() {
            controller.create_gate(new AndGate);
        },
    },
    {
        name: 'add-input-node',
        shortcuts: [new KeyCombination(187, '+', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
            for (const element of model.selected_elements) {
                if (element instanceof Gate) {
                    element.inputs.push(new InputNode(element));
                }
            }
        },
    },
    {
        name: 'add-input-switch',
        shortcuts: [],
        action: function() {
            controller.create_gate(new InputSwitch);
        },
    },
    {
        name: 'add-not-gate',
        shortcuts: [],
        action: function() {
            let nop_gate = new NopGate;
            controller.create_gate(nop_gate);

            nop_gate.outputs[0].is_inverted = true;
        },
    },
    {
        name: 'add-or-gate',
        shortcuts: [],
        action: function() {
            controller.create_gate(new OrGate);
        },
    },
    {
        name: 'add-output-light',
        shortcuts: [],
        action: function() {
            controller.create_gate(new OutputLight);
        },
    },
    {
        name: 'add-segment-display',
        shortcuts: [],
        action: function() {
            // controller.create_gate(new SegmentDisplay);
        },
    },
    {
        name: 'add-text-label',
        shortcuts: [],
        action: function() {
        },
    },
    {
        name: 'clear-recent-file-list',
        shortcuts: [],
        action: function() {
        },
    },
    {
        name: 'clear-recently-imported-list',
        shortcuts: [],
        action: function() {
        },
    },
    {
        name: 'copy',
        shortcuts: [new KeyCombination(67, 'c', KeyCombination.Modifier_Ctrl)],
        action: function() {
            controller.copy_selected_elements();
        },
    },
    {
        name: 'cut',
        shortcuts: [new KeyCombination(88, 'x', KeyCombination.Modifier_Ctrl)],
        action: function() {
            controller.copy_selected_elements();
            model.delete_selected_elements();
        },
    },
    {
        name: 'delete',
        shortcuts: [new KeyCombination(46, 'delete', KeyCombination.Modifier_None)],
        action: function() {
            model.delete_selected_elements();
        },
    },
    {
        name: 'escape',
        shortcuts: [new KeyCombination(27, 'escape', KeyCombination.Modifier_None)],
        action: function() {
            close_menu();
            model.deselect_all();
        },
    },
    {
        name: 'exit',
        shortcuts: [],
        action: function() {
            close();
        },
    },
    {
        name: 'grid-dots',
        shortcuts: [],
        action: function() {
            config.grid_style = grid_style.dots;
        },
    },
    {
        name: 'grid-none',
        shortcuts: [],
        action: function() {
            config.grid_style = grid_style.none;
        },
    },
    {
        name: 'grid-solid',
        shortcuts: [],
        action: function() {
            config.grid_style = grid_style.solid;
        },
    },
    {
        name: 'import',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Ctrl)],
        action: function() {
            controller.read_files(function(result) {
                controller.create_custom_gate(edit_after_parse(JSON.parse(result)));
                model.tick_all();
            });
        },
    },
    {
        name: 'invert',
        shortcuts: [new KeyCombination(73, 'i', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
            model.invert_selected_connection_nodes();
        },
    },
    {
        name: 'new',
        shortcuts: [new KeyCombination(78, 'n', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
            controller = new Controller();
            model = new Model();

            controller.reset_view();
        },
    },
    {
        name: 'open-file',
        shortcuts: [new KeyCombination(79, 'o', KeyCombination.Modifier_Ctrl)],
        action: function() {
            controller.read_files(function(result) {
                model.main_gate = edit_after_parse(JSON.parse(result));
                model.tick_all();
            });
        },
    },
    {
        name: 'open-folder',
        shortcuts: [new KeyCombination(79, 'o', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
        },
    },
    {
        name: 'paste',
        shortcuts: [new KeyCombination(86, 'v', KeyCombination.Modifier_Ctrl)],
        action: function() {
            controller.paste_copied_elements();
        },
    },
    {
        name: 'redo',
        shortcuts: [
            new KeyCombination(90, 'z', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift),
            new KeyCombination(89, 'y', KeyCombination.Modifier_Ctrl),
        ],
        action: function() {
        },
    },
    {
        name: 'reload',
        shortcuts: [new KeyCombination(82, 'r', KeyCombination.Modifier_Ctrl)],
        action: function() {
            const file_string = controller.get_file_string();

            controller = new Controller;
            model = new Model;

            model.main_gate = edit_after_parse(JSON.parse(file_string));
        },
    },
    {
        name: 'reopen-last-file',
        shortcuts: [new KeyCombination(84, 't', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
        },
    },
    {
        name: 'reset-view',
        shortcuts: [],
        action: function() {
            controller.reset_view();
        },
    },
    {
        name: 'save',
        shortcuts: [new KeyCombination(83, 's', KeyCombination.Modifier_Ctrl)],
        action: function() {
            download_string(controller.get_file_string(), 'file.circ');
        },
    },
    {
        name: 'save-as',
        shortcuts: [new KeyCombination(83, 's', KeyCombination.Modifier_Ctrl|KeyCombination.Modifier_Shift)],
        action: function() {
            download_string(controller.get_file_string(), 'file.circ');
        },
    },
    {
        name: 'select-all',
        shortcuts: [new KeyCombination(65, 'a', KeyCombination.Modifier_Ctrl)],
        action: function() {
            model.select_all();
        },
    },
    {
        name: 'theme-dark',
        shortcuts: [],
        action: function() {
            select_theme(config.colors_dark);
        },
    },
    {
        name: 'theme-light',
        shortcuts: [],
        action: function() {
            select_theme(config.colors_light);
        },
    },
    {
        name: 'undo',
        shortcuts: [new KeyCombination(90, 'z', KeyCombination.Modifier_Ctrl)],
        action: function() {
        },
    },
    {
        name: 'zoom-in',
        shortcuts: [new KeyCombination(187, '+', KeyCombination.Modifier_Ctrl)],
        action: function() {
            camera.scale_at(screen_center(), config.scale_factor);
        },
    },
    {
        name: 'zoom-out',
        shortcuts: [new KeyCombination(189, '-', KeyCombination.Modifier_Ctrl)],
        action: function() {
            camera.scale_at(screen_center(), 1/config.scale_factor);
        },
    },
];
