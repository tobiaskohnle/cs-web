'use strict';

function update() {
    requestAnimationFrame(update);

    camera.update();

    for (let i = 0; i < config.ticks_per_iteration; i++) {
        model.tick();
    }

    model.update();

    draw();
}

function draw() {
    context.save();

    clear_screen();

    switch (config.grid_style) {
        case grid_style.solid:
            draw_solid_grid();
            break;
        case grid_style.dots:
            draw_dot_grid();
            break;
    }

    camera.transform_canvas();

    for (const gate of model.main_gate.inner_gates) {
        gate.draw();
    }

    if (controller.mouse_move_state == mouse_move_state.creating_wire) {
        console.assert(controller.wire_start_node);

        draw_wire(
            Vec.add(controller.wire_start_node.pos, new Vec(controller.wire_start_node.dir,0)),
            controller.mouse_world_pos,
        );
    }

    context.restore();

    if (controller.mouse_move_state == mouse_move_state.creating_selection_box) {
        draw_selection_rect(
            controller.mousedown_mouse_pos,
            controller.mouse_pos,
        );
    }
}

function clear_screen() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function draw_selection_rect(pos_start, pos_end) {
    const size = Vec.sub(pos_end, pos_start);

    context.fillStyle = config.colors.selection_fill;
    context.fillRect(pos_start.x, pos_start.y, size.x, size.y);

    context.lineWidth = 2;
    context.strokeStyle = config.colors.selection_outline;
    context.strokeRect(pos_start.x|0, pos_start.y|0, size.x|0, size.y|0);
}

function draw_dot_grid() {
    const alpha = grid_alpha();

    if (alpha <= 0) {
        return;
    }

    context.globalAlpha = alpha;
    context.fillStyle = config.colors.grid;

    for (let x = mod(camera.anim_pos.x, camera.anim_scale); x < canvas.width; x += camera.anim_scale) {
        for (let y = mod(camera.anim_pos.y, camera.anim_scale); y < canvas.height; y += camera.anim_scale) {
            context.fillRect(x-1|0, y-1|0, 2, 2);
        }
    }

    context.globalAlpha = 1;
}
function draw_solid_grid() {
    const alpha = grid_alpha();

    if (alpha <= 0) {
        return;
    }

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = config.colors.grid;
    context.globalAlpha = alpha;

    for (let x = mod(camera.anim_pos.x, camera.anim_scale); x < canvas.width; x += camera.anim_scale) {
        context.moveTo(x|0, 0);
        context.lineTo(x|0, canvas.height);
    }
    for (let y = mod(camera.anim_pos.y, camera.anim_scale); y < canvas.height; y += camera.anim_scale) {
        context.moveTo(0, y|0);
        context.lineTo(canvas.width, y|0);
    }

    context.stroke();
    context.closePath();

    context.globalAlpha = 1;
}

function draw_wire(start_pos, end_pos, is_active=false) {
    context.beginPath();

    if (!start_pos || !end_pos) {
        return;
    }

    const center = Vec.add(start_pos, end_pos).div(2);

    if (start_pos.x < end_pos.x) {
        context.moveTo(start_pos.x, start_pos.y);
        context.lineTo(center.x, start_pos.y);
        context.lineTo(center.x, end_pos.y);
        context.lineTo(end_pos.x, end_pos.y);
    }
    else {
        context.moveTo(start_pos.x, start_pos.y);
        context.lineTo(start_pos.x, start_pos.y);
        context.lineTo(start_pos.x, center.y);
        context.lineTo(end_pos.x, center.y);
        context.lineTo(end_pos.x, end_pos.y);
        context.lineTo(end_pos.x, end_pos.y);
    }

    context.lineWidth = .1;
    context.strokeStyle = is_active ? config.colors.wire_active : config.colors.wire_inactive;
    context.stroke();
}

function grid_alpha() {
    return map(camera.anim_scale, 10, 4, 1, 0);
}

function screen_center() {
    return new Vec(canvas.width/2, canvas.height/2);
}

function anim_interpolate(value, target) {
    return Vec.add(value, Vec.mult(Vec.sub(target, value), config.anim_factor));
}
