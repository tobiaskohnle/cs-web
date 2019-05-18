'use strict';

let canvas;
let context;

let current_tab;

let current_action = {
    update_hovered_element: Symbol('current_action_update_hovered_element'),
    move_screen:            Symbol('current_action_move_screen'),
    create_wire:            Symbol('current_action_create_wire'),
    create_wire_segment:    Symbol('current_action_create_wire_segment'),
    create_selection_box:   Symbol('current_action_create_selection_box'),
    move_elements:          Symbol('current_action_move_elements'),
};
let grid_style = {
    none:   Symbol('grid_style_none'),
    lines:  Symbol('grid_style_lines'),
    dots:   Symbol('grid_style_dots'),
};

let global = {
    X: 0b1,
    Y: 0b10,
};

let theme = {
    light: {
        background: '#0000',
        grid: '#aaa7',
        light_inactive: '#fff4',
        light_active: '#f334',
        wire_inactive: '#000e',
        wire_active: '#f33e',
        segment_inactive: '#f334',
        segment_active: '#f33e',
        outline: '#000e',
        hovered: '#39de',
        selected: '#24ce',
        hovered_selected: '#26ee',
        selection_fill: '#17d3',
        selection_outline: '#39fa',
    },
    dark: {
        background: '#000',
        grid: '#aff3',
        light_inactive: '#0007',
        light_active: '#f337',
        wire_inactive: '#fffe',
        wire_active: '#f33e',
        segment_inactive: '#1473',
        segment_active: '#1afe',
        outline: '#fffe',
        hovered: '#39de',
        selected: '#24ce',
        hovered_selected: '#26ee',
        selection_fill: '#17d3',
        selection_outline: '#39fa',
    },
};

let config = {
    scale_factor: 1.14,
    camera_anim_factor: .3574,
    camera_motion_anim_factor: .0571,
    camera_motion_falloff_factor: .9125,
    anim_factor: .39,
    ticks_per_iteration: 1+1e2,
    block_unused_key_combinations: false,

    colors: null,
    grid_style: grid_style.dots,
};

function select_theme(colors) {
    config.colors = colors;

    canvas.style.background = colors.background;
    document.querySelector('.tabs').style.background = colors.background;
    document.querySelector('.sidebar').style.background = colors.background;
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
    if (event.key.match(/F([1-9]|1[0-2])/)) return;

    return current_tab.controller.event_key_down(event);
}

onmousedown = function(event) {
    menu_click(event.path || event.composedPath());

    if (event.target == canvas) {
        current_tab.controller.event_mouse_down(event);
    }
}

onmousemove = function(event) {
    current_tab.controller.event_mouse_move(event);
}

onmouseup = function(event) {
    current_tab.controller.event_mouse_up(event);
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
