'use strict';

let canvas;
let context;

let sidebar_canvas;
let sidebar_context;

let current_tab;

const Enum = {
    action: {
        none:                 Symbol('action_none'),
        start_wire:           Symbol('action_start_wire'),
        create_wire:          Symbol('action_create_wire'),
        create_wire_segment:  Symbol('action_create_wire_segment'),
        create_selection_box: Symbol('action_create_selection_box'),
        move_elements:        Symbol('action_move_elements'),
        edit_elements:        Symbol('action_edit_elements'),
        edit_elements_resize: Symbol('action_edit_elements_resize'),
        import_element:       Symbol('action_import_element'),
    },
    grid_style: {
        none:  Symbol('grid_style_none'),
        lines: Symbol('grid_style_lines'),
        dots:  Symbol('grid_style_dots'),
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
        background:         new Color(0,0,0,0)              , // #0000
        grid:               new Color(0,0,.67,7/16)         , // #aaa7
        light_inactive:     new Color(0,0,1,4/16)           , // #fff4
        light_active:       new Color(0,.8,1,4/16)          , // #f334
        wire_inactive:      new Color(0,0,0)                , // #000
        wire_active:        new Color(0,.8,1)               , // #f33
        segment_inactive:   new Color(0,.8,1)               , // #f334
        segment_active:     new Color(0,.8,1)               , // #f33
        outline:            new Color(200/360,0,0)          , // #000
        edit_outline:       new Color(353/360, .8, .9, .9)  ,
        hovered:            new Color(204/360,.77,.87)      , // #39d
        selected:           new Color(228/360,.83,.8)       , // #24c
        hovered_selected:   new Color(220/360,.86,.93)      , // #26e
        selection_fill:     new Color(210/360,.92,.87,3/16) , // #17d3
        selection_outline:  new Color(210/360,.8,1,10/16)   , // #39fa
        node_init:          new Color(.5,1,1,0)             ,
        gate_init:          new Color(.5,1,1,0)             ,
        label_text:         new Color(0, 0, .2)             , // #ccc
        label_special_text: new Color(60/360, .91, .2)      , // #cc1
        label_outline:      new Color(220/360, .2, .4, .7)  ,
        label_caret:        new Color(212/360, 1, 1)        , // #07f
        label_selection:    new Color(204/360, 1, 1, 4/16)  , // #09f4
    },
    dark: {
        background:         new Color(240/360,.22,.03)      , // #070709
        grid:               new Color(180/360,.33,1,5/16)   , // #aff5
        light_inactive:     new Color(0,0,0,7/16)           , // #0007
        light_active:       new Color(0,.8,1,7/16)          , // #f337
        wire_inactive:      new Color(0,0,1)                , // #fff
        wire_active:        new Color(0,.8,1)               , // #f33
        segment_inactive:   new Color(210/360,.86,.47,3/16) , // #1473
        segment_active:     new Color(201/360,.93,1)        , // #1af
        outline:            new Color(200/360,0,1)          , // #fff
        edit_outline:       new Color(353/360, .8, .9, .9)  ,
        hovered:            new Color(195/360,.85,.93)      , // #2be // #39d
        selected:           new Color(215/360,.85,.93)      , // #27e // #24c
        hovered_selected:   new Color(216/360,.92,.93)      , // #16e // #26e
        selection_fill:     new Color(210/360,.92,.87,3/16) , // #17d3
        selection_outline:  new Color(210/360,.8,1)         , // #39fa
        node_init:          new Color(.5,1,1,0)             ,
        gate_init:          new Color(.5,1,1,0)             ,
        label_text:         new Color(0, 0, .8)             , // #ccc
        label_special_text: new Color(60/360, .91, .8)      , // #cc1
        label_outline:      new Color(220/360, .2, .4, .7)  ,
        label_caret:        new Color(212/360, 1, 1)        , // #07f
        label_selection:    new Color(204/360, 1, 1, 4/16)  , // #09f4
    },
};

const config = {
    scale_factor: 1.14,
    color_anim_factor: .57,
    camera_anim_factor: .42,
    camera_motion_anim_factor: .06,
    camera_motion_falloff_factor: .91,

    label_anim_factor: .425,
    label_caret_width: .07,
    label_caret_smoothness: 3.1,
    label_caret_blink_rate: 1000,

    use_system_clipboard: false,

    anim_factor: .39,
    ticks_per_frame: 101,
    block_unused_key_combinations: false,
    default_grid_size: 30,
    default_rising_edge_pulse_length: 3,

    colors: null,
    grid_style: Enum.grid_style.dots,

    // TEMP
    DEBUG_LOG: false,
    DEBUG_DRAW_CONNECTIONS: true,
    // /TEMP

    next_id: 0,
};

function select_theme(colors) {
    config.colors = colors;

    const background_color = config.colors.background.to_string();

    document.documentElement.style.background = background_color;
    document.querySelector('.menubar').style.background = '#eee';
}

onload = function() {
    canvas = document.querySelector('.canvas');
    context = canvas.getContext('2d');

    sidebar_canvas = document.querySelector('.sidebar');
    sidebar_context = sidebar_canvas.getContext('2d');

    onresize();

    select_theme(theme.dark);

    current_tab = new Tab;

    canvas.onmouseleave = current_tab.controller.mouse_leave.bind(current_tab.controller);
    sidebar_canvas.onmouseleave = current_tab.controller.sidebar_mouse_leave.bind(current_tab.controller);

    add_menu_event_listeners();

    requestAnimationFrame(update);

    // TEMP
    const RESTORE_STATE = localStorage.getItem('CS-RESTORE-ON-STARTUP');

    if (RESTORE_STATE) {
        localStorage.removeItem('CS-RESTORE-ON-STARTUP');
        current_tab.model.main_gate = extended_parse(RESTORE_STATE);
        current_tab.model.tick_all();
    }
    // /TEMP
}

onresize = function() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    sidebar_canvas.width  = sidebar_canvas.clientWidth;
    sidebar_canvas.height = sidebar_canvas.clientHeight;
}

onkeydown = function(event) {
    if (event.key.match(/F\d{1,2}/)) return;

    return current_tab.controller.key_down(event);
}

onmousedown = function(event) {
    menu_click(event.path || event.composedPath());

    switch (current_tab.controller.element_mouse_captured || event.target) {
        case canvas:
            current_tab.controller.mouse_down(event);
            break;
        case sidebar_canvas:
            current_tab.controller.sidebar_mouse_down(event);
            break;
    }
}

onmousemove = function(event) {
    switch (current_tab.controller.element_mouse_captured || event.target) {
        case canvas:
            current_tab.controller.mouse_move(event);
            break;
        case sidebar_canvas:
            current_tab.controller.sidebar_mouse_move(event);
            break;
    }
}

onmouseup = function(event) {
    switch (current_tab.controller.element_mouse_captured || event.target) {
        case canvas:
            current_tab.controller.mouse_up(event);
            break;
        case sidebar_canvas:
            current_tab.controller.sidebar_mouse_up(event);
            break;
    }

    current_tab.controller.release_mouse();
}

ondragenter = function(event) {
    config.DEBUG_LOG && console.log('ONDRAGOVER', event);

    event.preventDefault();
    return false;
}

ondrop = function(event) {
    config.DEBUG_LOG && console.log('ONDROP', event);

    event.preventDefault();
    return false;
}

onwheel = function(event) {
    close_menu();

    if (!event.ctrlKey) {
        switch (event.target) {
            case canvas:
                current_tab.controller.mouse_wheel(event);
                break;
            case sidebar_canvas:
                current_tab.controller.sidebar_mouse_wheel(event);
                break;
        }
    }

    // event.preventDefault();
    // return false;
}

oncontextmenu = function(event) {
    if (!current_tab.controller.mouse_moved()) {
        open_menu('context-menu', event.x, event.y);
    }
    return false;
}

onblur = function() {
    close_menu();
}
