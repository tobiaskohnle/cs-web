'use strict';

const View = {
    update() {
        requestAnimationFrame(View.update);

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

        View.draw();
    },

    draw() {
        View.clear_screen();

        switch (cs.config.grid_style) {
            case 'lines':
                View.draw_grid_lines();
                break;
            case 'dots':
                View.draw_grid_dots();
                break;
        }

        context.save();
        cs.camera.transform_canvas();

        for (const gate of cs.context.inner_elements) {
            gate.draw();
        }

        for (const segment of cs.controller.new_wire_segments) {
            segment.draw();
        }

        context.restore();

        switch (cs.controller.current_action) {
            case Enum.action.create_selection_box:
                const pos_start =  cs.camera.to_anim_screenspace(cs.controller.mouse_down_world_pos);
                const pos_end = cs.controller.mouse_pos;

                const size = Vec.sub(pos_end, pos_start);

                context.fillStyle = cs.theme.selection_fill.to_string();
                context.fillRect(...pos_start.xy, ...size.xy);

                context.lineWidth = 2;
                context.strokeStyle = cs.theme.selection_outline.to_string();
                context.strokeRect(...Vec.floor(pos_start).xy, ...Vec.floor(size).xy);
                break;

            case Enum.action.move_elements_remove_mouse_up:
                const pos = new Vec(
                    Util.clamp(cs.controller.mouse_pos.x, 30, canvas.width-30),
                    Util.clamp(cs.controller.mouse_pos.y, 30, canvas.height-30),
                );

                context.beginPath();

                context.moveTo(pos.x-16, pos.y-16);
                context.lineTo(pos.x+16, pos.y+16);
                context.moveTo(pos.x-16, pos.y+16);
                context.lineTo(pos.x+16, pos.y-16);

                context.strokeStyle = '#e22';
                context.lineWidth = 8;
                context.stroke();
                break;
        }
    },

    clear_screen() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    },

    draw_grid_dots() {
        const alpha = View.grid_alpha();

        if (alpha <= 0) {
            return;
        }

        context.globalAlpha = alpha;
        context.fillStyle = cs.theme.grid_dots.to_string();

        for (let x = Util.mod(cs.camera.anim_pos_.x, cs.camera.anim_scale_); x < canvas.width; x += cs.camera.anim_scale_) {
            for (let y = Util.mod(cs.camera.anim_pos_.y, cs.camera.anim_scale_); y < canvas.height; y += cs.camera.anim_scale_) {
                context.fillRect(x-1|0, y-1|0, 2, 2);
            }
        }

        context.globalAlpha = 1;
    },
    draw_grid_lines() {
        const alpha = View.grid_alpha();

        if (alpha <= 0) {
            return;
        }

        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = cs.theme.grid_lines.to_string();
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
    },

    grid_alpha() {
        return Util.map(cs.camera.anim_scale_, 7, 15, 0, 1);
    },

    screen_center() {
        return new Vec(canvas.width/2, canvas.height/2);
    },

    update_title() {
        let title = 'cs \u2013 web';

        if (cs.config.current_file && cs.config.current_file.name) {
            title += ` \u2022 ${cs.config.current_file.name}`;
        }

        document.title = title;
    },

    anim_interpolate(value, target, factor=false) {
        if (value == null) return target;
        return value + (target-value) * (!cs.config.animations||factor||cs.config.anim_factor);
    },
    anim_interpolate_mod(value, target, factor=false) {
        const offset = Util.mod(target-value-.5, 1)-.5;
        return value + offset * (!cs.config.animations||factor||cs.config.anim_factor);
    },
    anim_interpolate_vec(value, target, factor=false) {
        if (target == null) return target;
        if (value == null || factor == true) return Vec.copy(target);
        return value.set(Vec.add(value, Vec.mult(Vec.sub(target, value), !cs.config.animations||factor||cs.config.anim_factor)));
    },
};
