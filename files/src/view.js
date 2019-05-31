assert = 0

'use strict';

function update() {
    requestAnimationFrame(update);

    current_tab.camera.update();

    for (let i = 0; i < config.ticks_per_frame; i++) {
        current_tab.model.tick();
    }

    current_tab.model.update();

    if (assert) console.assert(
        current_tab.model.main_gate.inner_elements.find(g => g instanceof AndGate).outputs[0].anim_pos_.y ==
        current_tab.model.main_gate.inner_elements.find(g => g instanceof AndGate).outputs[0].wire_segments[0].anim_offset_
    )

    // if (assert) console.assert(
    //     current_tab.model.main_gate.inner_elements.find(g => g instanceof OrGate).anim_pos_.y+1 ==
    //     current_tab.model.main_gate.inner_elements.find(g => g instanceof OrGate).inputs[0].anim_pos_.y
    // )

    draw();
}

function draw() {
    context.save();

    clear_screen();

    switch (config.grid_style) {
        case Enum.grid_style.lines:
            draw_grid_lines();
            break;
        case Enum.grid_style.dots:
            draw_grid_dots();
            break;
    }

    current_tab.camera.transform_canvas();

    for (const gate of current_tab.model.main_gate.inner_elements) {
        gate.draw();
    }

    if (current_tab.controller.current_action == Enum.action.create_wire) {
        console.assert(current_tab.controller.wire_start_node);

        // draw_wire(
        //     Vec.add(current_tab.controller.wire_start_node.pos, new Vec(current_tab.controller.wire_start_node.dir.x,0)),
        //     current_tab.controller.mouse_world_pos,
        // );
    }

    if (current_tab.controller.current_action == Enum.action.create_wire_segment) {
        for (const segment of current_tab.controller.new_wire_segments) {
            segment.draw();
        }
    }

    context.restore();

    if (current_tab.controller.current_action == Enum.action.create_selection_box) {
        draw_selection_rect(
            current_tab.camera.to_screenspace(current_tab.controller.mousedown_mouse_world_pos),
            current_tab.controller.mouse_pos,
        );
    }
}

function clear_screen() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function draw_selection_rect(pos_start, pos_end) {
    const size = Vec.sub(pos_end, pos_start);

    context.fillStyle = config.colors.selection_fill.to_string();
    context.fillRect(...pos_start.xy, ...size.xy);

    context.lineWidth = 2;
    context.strokeStyle = config.colors.selection_outline.to_string();
    context.strokeRect(...Vec.floor(pos_start).xy, ...Vec.floor(size).xy);
}

function draw_grid_dots() {
    const alpha = grid_alpha();

    if (alpha <= 0) {
        return;
    }

    context.globalAlpha = alpha;
    context.fillStyle = config.colors.grid.to_string();

    for (let x = mod(current_tab.camera.anim_pos_.x, current_tab.camera.anim_scale_); x < canvas.width; x += current_tab.camera.anim_scale_) {
        for (let y = mod(current_tab.camera.anim_pos_.y, current_tab.camera.anim_scale_); y < canvas.height; y += current_tab.camera.anim_scale_) {
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
    context.strokeStyle = config.colors.grid.to_string();
    context.globalAlpha = alpha;

    for (let x = mod(current_tab.camera.anim_pos_.x, current_tab.camera.anim_scale_); x < canvas.width; x += current_tab.camera.anim_scale_) {
        context.moveTo(x|0, 0);
        context.lineTo(x|0, canvas.height);
    }
    for (let y = mod(current_tab.camera.anim_pos_.y, current_tab.camera.anim_scale_); y < canvas.height; y += current_tab.camera.anim_scale_) {
        context.moveTo(0, y|0);
        context.lineTo(canvas.width, y|0);
    }

    context.stroke();
    context.closePath();

    context.globalAlpha = 1;
}

function grid_alpha() {
    return map(current_tab.camera.anim_scale_, 7, 15, 0, 1);
}

function screen_center() {
    return new Vec(canvas.width/2, canvas.height/2);
}

function anim_interpolate(value, target, factor=config.anim_factor) {
    if (value == null) return target;
    return value + (target-value) * factor;
}
function anim_interpolate_mod(value, target, factor=config.anim_factor) {
    const offset = mod(target-value-.5, 1)-.5;

    if (offset * (1-factor) > .1)  factor = 1 - .1/offset;
    if (offset * (1-factor) < -.1) factor = 1 + .1/offset;

    return value + offset * factor;
}
function anim_interpolate_vec(value, target, factor=config.anim_factor) {
    if (value == null) return Vec.copy(target);
    return value.set(Vec.add(value, Vec.mult(Vec.sub(target, value), factor)));
}
