'use strict';

function update() {
    requestAnimationFrame(update);

    cs.camera.update();

    if (cs.controller.tick_nodes) {
        for (let i = 0; i < cs.config.ticks_per_frame; i++) {
            Action.tick();
        }
    }

    Action.update();

    for (const segment of cs.controller.new_wire_segments) {
        segment.update();
    }

    cs.sidebar.update();
    cs.sidebar.draw();

    draw();
}

function draw() {
    clear_screen();

    switch (cs.config.grid_style) {
        case Enum.grid_style.lines:
            draw_grid_lines();
            break;
        case Enum.grid_style.dots:
            draw_grid_dots();
            break;
    }

    context.save();
    cs.camera.transform_canvas();

    for (const gate of cs.context.inner_elements) {
        gate.draw();
    }

    // TEMP
    if (cs.controller.current_action == Enum.action.create_wire_segment ||
        cs.controller.current_action == Enum.action.create_wire
    ) {
        console.assert(cs.controller.wire_start_node);

        for (const segment of cs.controller.new_wire_segments) {
            segment.draw();
        }
    }

    context.restore();

    if (cs.controller.current_action == Enum.action.create_selection_box) {
        draw_selection_rect(
            cs.camera.to_screenspace(cs.controller.mouse_down_world_pos),
            cs.controller.mouse_pos,
        );
    }
}

function clear_screen() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function draw_selection_rect(pos_start, pos_end) {
    const size = Vec.sub(pos_end, pos_start);

    context.fillStyle = cs.theme.selection_fill.to_string();
    context.fillRect(...pos_start.xy, ...size.xy);

    context.lineWidth = 2;
    context.strokeStyle = cs.theme.selection_outline.to_string();
    context.strokeRect(...Vec.floor(pos_start).xy, ...Vec.floor(size).xy);
}

function draw_grid_dots() {
    const alpha = grid_alpha();

    if (alpha <= 0) {
        return;
    }

    context.globalAlpha = alpha;
    context.fillStyle = cs.theme.grid.to_string();

    for (let x = Util.mod(cs.camera.anim_pos_.x, cs.camera.anim_scale_); x < canvas.width; x += cs.camera.anim_scale_) {
        for (let y = Util.mod(cs.camera.anim_pos_.y, cs.camera.anim_scale_); y < canvas.height; y += cs.camera.anim_scale_) {
            context.fillRect(x-1|0, y-1|0, 2, 2);
        }
    }

    context.globalAlpha = 1;
}
function draw_grid_lines() {
    const alpha = grid_alpha();

    if (alpha <= 0) {
        return;
    }

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = cs.theme.grid.to_string();
    context.globalAlpha = alpha;

    for (let x = Util.mod(cs.camera.anim_pos_.x, cs.camera.anim_scale_); x < canvas.width; x += cs.camera.anim_scale_) {
        context.moveTo(x|0, 0);
        context.lineTo(x|0, canvas.height);
    }
    for (let y = Util.mod(cs.camera.anim_pos_.y, cs.camera.anim_scale_); y < canvas.height; y += cs.camera.anim_scale_) {
        context.moveTo(0, y|0);
        context.lineTo(canvas.width, y|0);
    }

    context.stroke();
    context.closePath();

    context.globalAlpha = 1;
}

function grid_alpha() {
    return Util.map(cs.camera.anim_scale_, 7, 15, 0, 1);
}

function screen_center() {
    return new Vec(canvas.width/2, canvas.height/2);
}

function anim_interpolate(value, target, factor=cs.config.anim_factor) {
    if (value == null) return target;
    return value + (target-value) * factor;
}
function anim_interpolate_mod(value, target, factor=cs.config.anim_factor) {
    const offset = Util.mod(target-value-.5, 1)-.5;
    return value + offset * factor;
}
function anim_interpolate_vec(value, target, factor=cs.config.anim_factor) {
    if (target == null) return target;
    if (value == null) return Vec.copy(target);
    return value.set(Vec.add(value, Vec.mult(Vec.sub(target, value), factor)));
}
