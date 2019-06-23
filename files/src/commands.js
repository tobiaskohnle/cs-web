'use strict';

class KeyCombination {
    constructor(key, modifiers=KeyCombination.Modifier_None) {
        this.key = key.key;
        this.code = key.code;
        this.modifiers = modifiers;
    }

    matches_event(event) {
        if (event.shiftKey == !(this.modifiers & KeyCombination.Modifier_Shift)) return false;
        if (event.ctrlKey  == !(this.modifiers & KeyCombination.Modifier_Ctrl))  return false;
        if (event.altKey   == !(this.modifiers & KeyCombination.Modifier_Alt))   return false;

        return this.code == event.keyCode;
    }

    to_string() {
        let modifier_string = '';

        if (this.modifiers & KeyCombination.Modifier_Shift) modifier_string += 'Shift+';
        if (this.modifiers & KeyCombination.Modifier_Ctrl)  modifier_string += 'Ctrl+';
        if (this.modifiers & KeyCombination.Modifier_Alt)   modifier_string += 'Alt+';

        return `${modifier_string}${this.key}`;
    }

    static get Key_Tab()    { return { code:9,   key:'Tab',    }; }
    static get Key_Enter()  { return { code:13,  key:'Enter',  }; }
    static get Key_Escape() { return { code:27,  key:'Escape', }; }
    static get Key_Space()  { return { code:32,  key:'Space',  }; }
    static get Key_Delete() { return { code:46,  key:'Delete', }; }
    static get Key_A()      { return { code:65,  key:'A',      }; }
    static get Key_B()      { return { code:66,  key:'B',      }; }
    static get Key_C()      { return { code:67,  key:'C',      }; }
    static get Key_D()      { return { code:68,  key:'D',      }; }
    static get Key_E()      { return { code:69,  key:'E',      }; }
    static get Key_F()      { return { code:70,  key:'F',      }; }
    static get Key_G()      { return { code:71,  key:'G',      }; }
    static get Key_H()      { return { code:72,  key:'H',      }; }
    static get Key_I()      { return { code:73,  key:'I',      }; }
    static get Key_J()      { return { code:74,  key:'J',      }; }
    static get Key_K()      { return { code:75,  key:'K',      }; }
    static get Key_L()      { return { code:76,  key:'L',      }; }
    static get Key_M()      { return { code:77,  key:'M',      }; }
    static get Key_N()      { return { code:78,  key:'N',      }; }
    static get Key_O()      { return { code:79,  key:'O',      }; }
    static get Key_P()      { return { code:80,  key:'P',      }; }
    static get Key_Q()      { return { code:81,  key:'Q',      }; }
    static get Key_R()      { return { code:82,  key:'R',      }; }
    static get Key_S()      { return { code:83,  key:'S',      }; }
    static get Key_T()      { return { code:84,  key:'T',      }; }
    static get Key_U()      { return { code:85,  key:'U',      }; }
    static get Key_V()      { return { code:86,  key:'V',      }; }
    static get Key_W()      { return { code:87,  key:'W',      }; }
    static get Key_X()      { return { code:88,  key:'X',      }; }
    static get Key_Y()      { return { code:89,  key:'Y',      }; }
    static get Key_Z()      { return { code:90,  key:'Z',      }; }
    static get Key_Plus()   { return { code:187, key:'+',      }; }
    static get Key_Minus()  { return { code:189, key:'-',      }; }

    static get Modifier_None()  { return 0; }
    static get Modifier_Shift() { return 1; }
    static get Modifier_Ctrl()  { return 2; }
    static get Modifier_Alt()   { return 4; }
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
        name: 'add-xor-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-xor-gate');
            current_tab.controller.init_element(new XorGate);
        },
    },
    {
        name: 'add-input-node',
        shortcuts: [new KeyCombination(KeyCombination.Key_Plus, KeyCombination.Modifier_Shift)],
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
        name: 'add-label',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) add-label');
            const label = new Label;
            label.text = 'Text...';
            current_tab.controller.init_element(label);
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
        name: 'change-type-xor-gate',
        shortcuts: [],
        command: function() {
            current_tab.controller.save_state('(command) change-type-xor-gate');
            current_tab.controller.change_element(new XorGate);
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
        shortcuts: [new KeyCombination(KeyCombination.Key_C, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.copy();
        },
    },
    {
        name: 'cut',
        shortcuts: [new KeyCombination(KeyCombination.Key_X, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) cut');
            current_tab.controller.copy();
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'delete',
        shortcuts: [new KeyCombination(KeyCombination.Key_Delete)],
        command: function() {
            current_tab.controller.save_state('(command) delete');
            current_tab.controller.current_action = Enum.action.none;
            current_tab.model.delete_selected_elements();
        },
    },
    {
        name: 'escape',
        shortcuts: [new KeyCombination(KeyCombination.Key_Escape)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_Enter)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_I, KeyCombination.Modifier_Ctrl)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_L, KeyCombination.Modifier_Ctrl)],
        command: function() {
            const file_string = current_tab.controller.file_string();
            current_tab.controller.init_custom_gate(extended_parse(file_string));
            current_tab.model.tick_all();
        },
    },
    {
        name: 'invert',
        shortcuts: [new KeyCombination(KeyCombination.Key_I, KeyCombination.Modifier_Shift)],
        command: function() {
            current_tab.controller.save_state('(command) invert');
            current_tab.model.invert_selected_connection_nodes();
        },
    },
    {
        name: 'new',
        shortcuts: [new KeyCombination(KeyCombination.Key_N, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) new');
            current_tab.reset();
            current_tab.camera.reset();
        },
    },
    {
        name: 'open-file',
        shortcuts: [new KeyCombination(KeyCombination.Key_O, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.read_files(function(result) {
                current_tab.model.main_gate = extended_parse(result);
                current_tab.model.tick_all();
            });
        },
    },
    {
        name: 'open-folder',
        shortcuts: [new KeyCombination(KeyCombination.Key_O, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
        },
    },
    {
        name: 'paste',
        shortcuts: [new KeyCombination(KeyCombination.Key_V, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.save_state('(command) paste');
            current_tab.controller.paste();
        },
    },
    {
        name: 'undo',
        shortcuts: [new KeyCombination(KeyCombination.Key_Z, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.controller.undo();
        },
    },
    {
        name: 'redo',
        shortcuts: [
            new KeyCombination(KeyCombination.Key_Z, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl),
            new KeyCombination(KeyCombination.Key_Y, KeyCombination.Modifier_Ctrl),
        ],
        command: function() {
            current_tab.controller.redo();
        },
    },
    {
        name: 'TEMP-SAVE-STATE',
        shortcuts: [
            new KeyCombination(KeyCombination.Key_S),
        ],
        command: function() {
            current_tab.controller.save_state('COMMAND');
        },
    },
    {
        name: 'TEMP-RELOAD',
        shortcuts: [new KeyCombination(KeyCombination.Key_R)],
        command: function() {
            localStorage.setItem('CS-RESTORE-ON-STARTUP', current_tab.controller.file_string());
            location.reload();
        },
    },
    {
        name: 'reopen-last-file',
        shortcuts: [new KeyCombination(KeyCombination.Key_T, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_S, KeyCombination.Modifier_Ctrl)],
        command: function() {
            download_string(current_tab.controller.file_string(), 'file.circ');
        },
    },
    {
        name: 'save-as',
        shortcuts: [new KeyCombination(KeyCombination.Key_S, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_A, KeyCombination.Modifier_Shift)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_A, KeyCombination.Modifier_Ctrl)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_A, KeyCombination.Modifier_Shift|KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.model.deselect_all();
        },
    },
    {
        name: 'split-segment',
        shortcuts: [new KeyCombination(KeyCombination.Key_S, KeyCombination.Modifier_Shift)],
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
        shortcuts: [new KeyCombination(KeyCombination.Key_Plus, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.camera.scale_at(screen_center(), config.scale_factor);
        },
    },
    {
        name: 'zoom-out',
        shortcuts: [new KeyCombination(KeyCombination.Key_Minus, KeyCombination.Modifier_Ctrl)],
        command: function() {
            current_tab.camera.scale_at(screen_center(), 1/config.scale_factor);
        },
    },
    {
        name: 'debug-toggle',
        shortcuts: [],
        command: function() {
        },
    },
    {
        name: 'debug-step',
        shortcuts: [
            new KeyCombination(KeyCombination.Key_Tab),
            new KeyCombination(KeyCombination.Key_Space),
        ],
        command: function() {
            console.log('debug-step');
        },
    },
    {
        name: 'debug-single-step',
        shortcuts: [
            new KeyCombination(KeyCombination.Key_Tab, KeyCombination.Modifier_Shift),
            new KeyCombination(KeyCombination.Key_Space, KeyCombination.Modifier_Shift),
        ],
        command: function() {
            console.log('debug-single-step');
        },
    },
];
