'use strict';

let canvas;
let context;

let current_tab;

const Enum = {
    action: {
        none:                 Symbol('action_none'),
        create_wire:          Symbol('action_create_wire'),
        create_wire_segment:  Symbol('action_create_wire_segment'),
        create_selection_box: Symbol('action_create_selection_box'),
        move_elements:        Symbol('action_move_elements'),
        edit_elements:        Symbol('action_edit_elements'),
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
        background:        new Color(0,0,0,0)              , // #0000
        grid:              new Color(0,0,.67,7/16)         , // #aaa7
        light_inactive:    new Color(0,0,1,4/16)           , // #fff4
        light_active:      new Color(0,.8,1,4/16)          , // #f334
        wire_inactive:     new Color(0,0,0)                , // #000
        wire_active:       new Color(0,.8,1)               , // #f33
        segment_inactive:  new Color(0,.8,1)               , // #f334
        segment_active:    new Color(0,.8,1)               , // #f33
        outline:           new Color(200/360,0,0)          , // #000
        hovered:           new Color(204/360,.77,.87)      , // #39d
        selected:          new Color(228/360,.83,.8)       , // #24c
        hovered_selected:  new Color(220/360,.86,.93)      , // #26e
        selection_fill:    new Color(210/360,.92,.87,3/16) , // #17d3
        selection_outline: new Color(210/360,.8,1,10/16)   , // #39fa
        node_init:         new Color(.5,1,1,0)             ,
        gate_init:         new Color(.5,1,1,0)             ,
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
    color_anim_factor: .22,
    camera_anim_factor: .42,
    camera_motion_anim_factor: .06,
    camera_motion_falloff_factor: .91,

    label_anim_factor: .425,
    label_caret_width: .07,
    label_caret_smoothness: 3.1, // Infinity: instant
    label_caret_blink_rate: 1000,

    use_system_clipboard: false,

    anim_factor: .39,
    ticks_per_frame: 101,
    block_unused_key_combinations: false,
    default_grid_size: 30,
    default_rising_edge_pulse_length: 3,

    colors: null,
    grid_style: Enum.grid_style.dots,
};

function select_theme(colors) {
    config.colors = colors;

    const background_color = config.colors.background.to_string();

    canvas.style.background = background_color;
    document.querySelector('.tabs').style.background = background_color;
    document.querySelector('.sidebar').style.background = background_color;
}

onload = function() {
    canvas = document.querySelector('canvas');
    context = canvas.getContext('2d');
    onresize();

    select_theme(theme.dark);

    current_tab = new Tab;

    add_menu_event_listeners();

    requestAnimationFrame(update);
}

onresize = function() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    context.imageSmoothingEnabled = false;
}

onkeydown = function(event) {
    if (event.key.match(/F\d{1,2}/)) return;

    return current_tab.controller.key_down(event);
}

onmousedown = function(event) {
    menu_click(event.path || event.composedPath());

    if (event.target == canvas) {
        current_tab.controller.mouse_down(event);
    }
}

onmousemove = function(event) {
    current_tab.controller.mouse_move(event);
}

onmouseup = function(event) {
    current_tab.controller.mouse_up(event);
}

ondragenter = function(event) {
    console.log('ONDRAGOVER', event);

    event.preventDefault();
    return false;
}

ondrop = function(event) {
    console.log('ONDROP', event);

    event.preventDefault();
    return false;
}

document.documentElement.addEventListener(
    'wheel',
    function(event) {
        close_menu();

        const scale_factor = event.deltaY < 0 ? config.scale_factor : 1/config.scale_factor;
        current_tab.camera.scale_at(current_tab.controller.mouse_pos, scale_factor);

        event.preventDefault();
        return false;
    },
    {passive: false},
);

oncontextmenu = function(event) {
    if (!current_tab.controller.mouse_moved()) {
        open_menu('context-menu', event.x, event.y);
    }
    return false;
}

onblur = function() {
    close_menu();
}
