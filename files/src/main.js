'use strict';

let canvas;
let context;

let sidebar_canvas;
let sidebar_context;

let cs;

const Enum = {
    action: {
        none:                 Symbol('action_none'),
        start_wire:           Symbol('action_start_wire'),
        rewire:               Symbol('action_rewire'),
        create_wire:          Symbol('action_create_wire'),
        create_wire_segment:  Symbol('action_create_wire_segment'),
        create_selection_box: Symbol('action_create_selection_box'),
        move_elements:        Symbol('action_move_elements'),
        edit_elements:        Symbol('action_edit_elements'),
        edit_elements_resize: Symbol('action_edit_elements_resize'),
        import_element:       Symbol('action_import_element'),
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
    align: {
        start:  0,
        center: 1,
        end:    2,
    },
};

const theme = {
    light: {
        grid_dots:                Color.parse('#aaa8'),
        grid_lines:               Color.parse('#aaa7'),
        light_inactive:           Color.parse('#fff4'),
        light_active:             Color.parse('#f334'),
        wire_inactive:            new Color(.6,1,0),
        wire_active:              Color.parse('#f33'),
        segment_inactive:         Color.parse('#f334'),
        segment_active:           Color.parse('#f33'),
        merge_segment_flash:      Color.parse('#0f1'),
        outline:                  new Color(.6,1,0),
        edit_outline:             Color.parse('#e34'),
        hovered:                  Color.parse('#39d'),
        selected:                 Color.parse('#24c'),
        hovered_selected:         Color.parse('#26e'),
        selection_fill:           Color.parse('#17d3'),
        selection_outline:        Color.parse('#39fd'),
        node_init:                Color.parse('#0ef0'),
        gate_init:                Color.parse('#0ef0'),
        label_text:               Color.parse('#222'),
        label_special_text:       Color.parse('#330'),
        label_outline:            Color.parse('#5560'),
        label_caret:              Color.parse('#07f'),
        label_selection:          Color.parse('#09f4'),
        sidebar_imported_element: Color.parse('#28f7'),
        sidebar_hovered_element:  Color.parse('#49e4'),
        sidebar_header_outline:   Color.parse('#222'),
        sidebar_header_hovered:   Color.parse('#9cf'),
        sidebar_header:           Color.parse('#eee'),
        sidebar_header_font:      Color.parse('#222'),
    },
    dark: {
        grid_dots:                Color.parse('#acf6'),
        grid_lines:               Color.parse('#cef1'),
        light_inactive:           Color.parse('#0007'),
        light_active:             Color.parse('#f337'),
        wire_inactive:            new Color(.6,0,1),
        wire_active:              Color.parse('#f33'),
        segment_inactive:         Color.parse('#1473'),
        segment_active:           Color.parse('#1af'),
        merge_segment_flash:      Color.parse('#0f1'),
        outline:                  new Color(.6,0,1),
        edit_outline:             Color.parse('#e34'),
        hovered:                  Color.parse('#2be'),
        selected:                 Color.parse('#27e'),
        hovered_selected:         Color.parse('#16e'),
        selection_fill:           Color.parse('#17d3'),
        selection_outline:        Color.parse('#39fd'),
        node_init:                Color.parse('#0ef0'),
        gate_init:                Color.parse('#0ef0'),
        label_text:               Color.parse('#ccc'),
        label_special_text:       Color.parse('#cc1'),
        label_outline:            Color.parse('#5560'),
        label_caret:              Color.parse('#07f'),
        label_selection:          Color.parse('#09f4'),
        sidebar_imported_element: Color.parse('#2af6'),
        sidebar_hovered_element:  Color.parse('#49e2'),
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
    show_ui: true,

    ticks_per_frame: 101,
    scale_factor: 1.14,
    block_unused_key_combinations: false,
    use_system_clipboard: false,
    use_wire_restructuring: true,
    gates_push_wires: true,
    prevent_element_overlapping: true,

    anim_factor: .52,
    camera_anim_factor: .42,
    camera_motion_anim_factor: .06,


    default_color_anim_factor: .57,
    fade_color_anim_factor: .02,
    fast_color_anim_factor: .79,

    camera_motion_falloff_factor: .91,

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
        reset_view:            '',
        save:                  'Ctrl+s',
        save_as:               'Ctrl+Shift+S',
        select_all:            'Shift+A',
        next_vertical_align:   '',
        next_horizontal_align: '',
        toggle_selection:      'Ctrl+a',
        deselect_all:          'Ctrl+Shift+A',
        split_segment:         'Shift+S',
        zoom_in:               'Ctrl+*',
        zoom_out:              'Ctrl+_',
        debug_toggle:          '',
        debug_step:            'tab, space',
        debug_single_step:     'Shift+tab, Shift+space',
        open_settings:         '',

        escape:                'escape',
        enter:                 'enter',
        TEMP_RELOAD:           'r',
        TEMP_REDRAW:           'd',
    },
};

function load_config() {
    try {
        const loaded_config = localStorage.getItem('cs_config');

        if (loaded_config) {
            cs.config = Object.assign(Object.assign({}, default_config), JSON.parse(loaded_config));
            return;
        }
    }
    catch {}

    cs.config = Object.assign({}, default_config);
    console.warn('localStorage is unavailable');
}
function save_config() {
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

    // TEMP
    cs.config.DEBUG_LOG = false;
    cs.config.DEBUG_DRAW_CONNECTIONS = true;

    View.select_theme(cs.config.theme);

    cs.camera = new Camera(new Vec, cs.config.default_grid_size);

    cs.context = new CustomGate;

    cs.ticked_nodes = new Set;
    cs.selected_elements = new Set;

    cs.controller = new Controller;

    cs.sidebar = new Sidebar;

    canvas.addEventListener('mousedown',  cs.controller.mouse_down .bind(cs.controller), {passive:true});
    canvas.addEventListener('mousemove',  cs.controller.mouse_move .bind(cs.controller), {passive:true});
    canvas.addEventListener('mouseup',    cs.controller.mouse_up   .bind(cs.controller), {passive:true});
    canvas.addEventListener('mouseleave', cs.controller.mouse_leave.bind(cs.controller), {passive:true});
    canvas.addEventListener('wheel',      cs.controller.mouse_wheel.bind(cs.controller), {passive:true});

    sidebar_canvas.addEventListener('mousedown',  cs.controller.sidebar_mouse_down .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('mousemove',  cs.controller.sidebar_mouse_move .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('mouseup',    cs.controller.sidebar_mouse_up   .bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('mouseleave', cs.controller.sidebar_mouse_leave.bind(cs.controller), {passive:true});
    sidebar_canvas.addEventListener('wheel',      cs.controller.sidebar_mouse_wheel.bind(cs.controller), {passive:true});

    add_menu_event_listeners();

    requestAnimationFrame(View.update);

    // TEMP
    const RESTORE_STATE = localStorage.getItem('CS_RESTORE_ON_STARTUP');

    if (RESTORE_STATE) {
        localStorage.removeItem('CS_RESTORE_ON_STARTUP');
        cs.context = Util.extended_parse(RESTORE_STATE);
        ActionUtil.queue_tick_all();
    }
}

onresize = function(event) {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    sidebar_canvas.width  = sidebar_canvas.clientWidth;
    sidebar_canvas.height = sidebar_canvas.clientHeight;
}

onkeydown = function(event) {
    if (event.key.match(/f\d+/i)) return;
    return cs.controller.key_down(event);
}

onmousedown = function(event) {
    menu_click(event.path || event.composedPath());
    Settings.hide_tooltip();
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
    View.close_menu();
    Settings.hide_tooltip();
}

oncontextmenu = function(event) {
    if (!cs.controller.mouse_moved()) {
        open_menu('context-menu', event.x, event.y);
    }
    return false;
}

onblur = function(event) {
    View.close_menu();
    Settings.hide_tooltip();
}

onbeforeunload = function(event) {
    save_config();
}
