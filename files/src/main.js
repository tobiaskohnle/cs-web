'use strict';

let canvas;
let context;

let sidebar_canvas;
let sidebar_context;

let cs;

const Enum = {
    action: {
        none:                          Symbol('action_none'),
        start_wire:                    Symbol('action_start_wire'),
        rewire_input:                  Symbol('action_rewire_input'),
        rewire_output:                 Symbol('action_rewire_output'),
        create_wire:                   Symbol('action_create_wire'),
        create_wire_segment:           Symbol('action_create_wire_segment'),
        create_selection_box:          Symbol('action_create_selection_box'),
        move_elements:                 Symbol('action_move_elements'),
        move_elements_remove_mouse_up: Symbol('action_move_elements_remove_mouse_up'),
        edit_labels:                   Symbol('action_edit_labels'),
        resize_elements:               Symbol('action_resize_elements'),
        import_element:                Symbol('action_import_element'),
    },
    grid_style: {
        none:  'none',
        lines: 'lines',
        dots:  'dots',
    },
    joints_style: {
        none:   'none',
        square: 'square',
        round:  'round',
    },
    side: {
        east:  0,
        south: 1,
        west:  2,
        north: 3,
    },
};

const theme = {
    light: {
        grid_dots:                Color.parse('#aaa8'),
        grid_lines:               Color.parse('#aaa7'),

        light_inactive:           Color.parse('#f330'),
        light_active:             Color.parse('#f334'),
        wire_inactive:            new Color(.6,1,0),
        wire_active:              Color.parse('#f33'),
        segment_inactive:         Color.parse('#f334'),
        segment_active:           Color.parse('#f33'),

        outline:                  new Color(.6,1,0),
        hovered:                  Color.parse('#39d'),
        selected:                 Color.parse('#14d'),

        selection_fill:           Color.parse('#17d3'),
        selection_outline:        Color.parse('#39fd'),

        node_init:                Color.parse('#0ef0'),
        gate_init:                Color.parse('#0ef0'),
        merge_segment_flash:      Color.parse('#0f1'),

        label_text:               Color.parse('#222'),
        label_special_text:       Color.parse('#330'),
        label_description_text:   Color.parse('#1ad'),
        label_outline:            Color.parse('#5560'),
        label_caret:              Color.parse('#07f'),
        label_selection:          Color.parse('#09f4'),

        sidebar_imported_group:   Color.parse('#28f7'),
        sidebar_hovered_group:    Color.parse('#49e4'),
        sidebar_header_outline:   Color.parse('#222'),
        sidebar_header_hovered:   Color.parse('#9cf'),
        sidebar_header:           Color.parse('#eee'),
        sidebar_header_font:      Color.parse('#222'),
    },
    dark: {
        grid_dots:                Color.parse('#acf6'),
        grid_lines:               Color.parse('#cef1'),

        light_inactive:           Color.parse('#f330'),
        light_active:             Color.parse('#f337'),
        wire_inactive:            new Color(.6,0,1),
        wire_active:              Color.parse('#f33'),
        segment_inactive:         Color.parse('#1473'),
        segment_active:           Color.parse('#1af'),

        outline:                  new Color(.6,0,1),
        hovered:                  Color.parse('#2be'),
        selected:                 Color.parse('#16f'),

        selection_fill:           Color.parse('#17d3'),
        selection_outline:        Color.parse('#39fd'),

        node_init:                Color.parse('#0ef0'),
        gate_init:                Color.parse('#0ef0'),
        merge_segment_flash:      Color.parse('#0f1'),

        label_text:               Color.parse('#ccc'),
        label_special_text:       Color.parse('#cc1'),
        label_description_text:   Color.parse('#2ce'),
        label_outline:            Color.parse('#5560'),
        label_caret:              Color.parse('#07f'),
        label_selection:          Color.parse('#09f4'),

        sidebar_imported_group:   Color.parse('#2af6'),
        sidebar_hovered_group:    Color.parse('#49e2'),
        sidebar_header_outline:   Color.parse('#222'),
        sidebar_header_hovered:   Color.parse('#222'),
        sidebar_header:           Color.parse('#0b0b0d'),
        sidebar_header_font:      Color.parse('#eee'),
    },
};

const default_config = {
    theme: 'light',
    default_grid_size: 32,
    grid_style: Enum.grid_style.lines,
    joints_style: Enum.joints_style.square,
    hide_ui_in_fullscreen: true,
    input_arrows: true,

    ticks_per_frame: 101,
    scale_factor: 1.14,
    block_unused_key_combinations: false,
    use_system_clipboard: false,
    use_wire_restructuring: true,
    gates_push_wires: true,
    sticky_labels: true,

    animations: true,
    anim_factor: .52,
    camera_anim_factor: .42,


    sidebar_header_height: 40,

    sidebar_anim_factor: .37,

    sidebar_margin: 2,
    sidebar_scale: 20,


    default_color_anim_factor: .57,
    fade_color_anim_factor: .02,
    fast_color_anim_factor: .79,

    label_anim_factor: .425,
    label_caret_width: .07,
    label_caret_smoothness: 3.1,
    label_caret_blink_rate: 1000,

    default_rising_edge_pulse_length: 32,
    next_id: 0,


    keybinds: {
        add_input_node:        'Shift+*',
        remove_input_node:     'Shift+_',
        view_content:          '',
        copy:                  'Ctrl+c',
        cut:                   'Ctrl+x',
        paste:                 'Ctrl+v',
        delete:                'delete',
        import:                'Ctrl+i',
        instant_import:        'Ctrl+l',
        invert:                'Shift+I',
        new:                   '',
        open_file:             'Ctrl+o',
        undo:                  'Ctrl+z',
        redo:                  'Ctrl+y, Ctrl+Shift+Z',
        reopen_last_file:      'Ctrl+Shift+T',
        toggle_sidebar:        'Ctrl+b',
        toggle_fullscreen:     'f11',
        save:                  'Ctrl+s',
        save_as:               'Ctrl+Shift+S',
        select_all:            'Shift+A',
        toggle_selection:      'Ctrl+a',
        deselect_all:          'Ctrl+Shift+A',
        split_segment:         'Shift+S',
        reset_view:            '',
        zoom_in:               'Ctrl++',
        zoom_out:              'Ctrl+-',
        zoom_to_selection:     '',
        toggle_single_ticks:   '',
        tick_step:             'tab, space',
        tick_single_step:      'Shift+tab, Shift+space',
        open_settings:         '',
        escape:                'escape',
        enter:                 'enter',
    },
};

function load_config() {
    try {
        const loaded_config = localStorage.getItem('cs_config');

        if (loaded_config) {
            cs.config = Object.assign(Object.assign({}, default_config), JSON.parse(loaded_config));

            setTimeout(function() {
                const categories = Util.extended_parse(cs.config.sidebar);

                if (categories instanceof Array) {
                    cs.sidebar.categories = categories;
                    cs.sidebar.update();
                }
                else {
                    console.error('Failed to load categories.');
                    console.log({categories});
                }
            });
            return;
        }
    }
    catch {}

    cs.config = Object.assign({}, default_config);
    console.warn('localStorage is unavailable');
}
function save_config() {
    cs.config.sidebar = Util.extended_stringify(cs.sidebar.categories);

    localStorage.setItem('cs_config', JSON.stringify(cs.config));
}

onload = function() {
    Settings.load();

    canvas = document.querySelector('.canvas');
    context = canvas.getContext('2d');

    sidebar_canvas = document.querySelector('.sidebar');
    sidebar_context = sidebar_canvas.getContext('2d');

    onresize();

    cs = {};

    load_config();

    Menu.select_theme(cs.config.theme);

    cs.camera = new Camera(new Vec, cs.config.default_grid_size);

    cs.context = new CustomGate;

    cs.ticked_nodes = new Set;
    cs.selected_elements = new Set;

    cs.controller = new Controller;

    cs.sidebar = new Sidebar;

    canvas.addEventListener('mousedown',    cs.controller.mouse_click.bind(cs.controller), {passive:true});
    canvas.addEventListener('pointerdown',  cs.controller.mouse_down .bind(cs.controller), {passive:true});
    canvas.addEventListener('pointermove',  cs.controller.mouse_move .bind(cs.controller), {passive:true});
    canvas.addEventListener('pointerup',    cs.controller.mouse_up   .bind(cs.controller), {passive:true});
    canvas.addEventListener('pointerleave', cs.controller.mouse_leave.bind(cs.controller), {passive:true});
    canvas.addEventListener('wheel',        cs.controller.mouse_wheel.bind(cs.controller), {passive:true});

    sidebar_canvas.addEventListener('pointerdown',  cs.controller.sidebar_mouse_down .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('pointermove',  cs.controller.sidebar_mouse_move .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('pointerup',    cs.controller.sidebar_mouse_up   .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('pointerleave', cs.controller.sidebar_mouse_leave.bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('wheel',        cs.controller.sidebar_mouse_wheel.bind(cs.controller), {passive:true});

    Menu.add_event_listeners();

    requestAnimationFrame(View.update);

    if (cs.config.current_file) {
        cs.context = Util.extended_parse(cs.config.current_file.content);
        ActionUtil.queue_tick_all();
    }

    View.update_title();
}

onresize = function(event) {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    sidebar_canvas.width  = sidebar_canvas.clientWidth;
    sidebar_canvas.height = sidebar_canvas.clientHeight;
}

onkeydown = function(event) {
    return cs.controller.key_down(event);
}

onpointerdown = function(event) {
    if (event.buttons & -2) {
        Menu.close();
    }
    else {
        Menu.click(event.path || event.composedPath());
        Settings.hide_tooltip();
    }
}

ondragenter = function(event) {
    cs.config.DEBUG_LOG && console.log('ondragenter', event);

    event.preventDefault();
    return false;
}

ondrop = function(event) {
    cs.config.DEBUG_LOG && console.log('ondrop', event);

    event.preventDefault();
    return false;
}

onwheel = function(event) {
    Menu.close();
    Settings.hide_tooltip();
}

oncontextmenu = function(event) {
    if (!cs.controller.mouse_moved()) {
        Menu.open('context-menu', event.x, event.y);
    }
    return false;
}

onblur = function(event) {
    Menu.close();
    Settings.hide_tooltip();
}

onbeforeunload = function(event) {
    save_config();
}
