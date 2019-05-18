'use strict';

let canvas;
let context;

let camera;

let mouse_move_state = {
    update_hovered_element: Symbol('mouse_move_state_update_hovered_element'),
    move_screen:            Symbol('mouse_move_state_move_screen'),
    creating_wire:          Symbol('mouse_move_state_creating_wire'),
    creating_selection_box: Symbol('mouse_move_state_creating_selection_box'),
    moving_elements:        Symbol('mouse_move_state_moving_elements'),
};
let grid_style = {
    none:   Symbol('grid_style_none'),
    solid:  Symbol('grid_style_solid'),
    dots:   Symbol('grid_style_dots'),
};

let global = {
    X: 0b1,
    Y: 0b10,
};

let config = {
    scale_factor: 1.14,
    camera_anim_factor: .3574,
    camera_motion_anim_factor: .0571,
    camera_motion_falloff_factor: .9125,
    anim_factor: .39,
    ticks_per_iteration: 1+1e2,
    block_unused_key_combinations: false,

    colors_light: {
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
    colors_dark: {
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
    colors: null,
    grid_style: grid_style.dots,
};

function select_theme(colors) {
    config.colors = colors;

    canvas.style.background = colors.background;
    document.querySelector('.tabs').style.background = colors.background;
    document.querySelector('.sidebar').style.background = colors.background;
}

let controller;
let model;

onload = function() {
    canvas = document.querySelector('canvas');
    context = canvas.getContext('2d');
    onresize();

    select_theme(config.colors_light);

    camera = new Camera(new Vec, 30);

    controller = new Controller;
    model = new Model;

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

    return controller.event_key_down(event);
}

onmousedown = function(event) {
    menu_click(event.path || event.composedPath());

    if (event.target == canvas) {
        controller.event_mouse_down(event);
    }
}

onmousemove = function(event) {
    controller.event_mouse_move(event);
}

onmouseup = function(event) {
    controller.event_mouse_up(event);
}

document.documentElement.addEventListener(
    'wheel',
    function(event) {
        close_menu();

        const scale_factor = event.deltaY < 0 ? config.scale_factor : 1/config.scale_factor;
        camera.scale_at(controller.mouse_pos, scale_factor);

        event.preventDefault();
        return false;
    },
    {passive: false},
);

oncontextmenu = function(event) {
    if (!controller.mouse_moved()) {
        open_menu('context-menu', event.x, event.y);
    }
    return false;
}

onblur = function() {
    close_menu();
}
