'use strict';

class Camera {
    constructor(pos=new Vec, scale=1) {
        this.init_pos = pos.copy();
        this.init_scale = scale;

        this.pos = pos.copy();
        this.motion = new Vec;
        this.scale = scale;

        this.abs_pos = pos.copy();
        this.anim_abs_pos = pos.copy();

        this.anim_pos = pos.copy();
        this.anim_scale = scale;
    }

    reset() {
        this.pos.set(this.init_pos);
        this.scale = this.init_scale;
    }

    update() {
        this.pos.add(Vec.mult(this.motion, config.camera_motion_anim_factor));
        this.abs_pos.add(Vec.mult(this.motion, config.camera_motion_anim_factor));
        this.motion.mult(config.camera_motion_falloff_factor);

        this.anim_abs_pos.add(Vec.sub(this.abs_pos, this.anim_abs_pos).mult(config.camera_anim_factor));

        this.anim_pos.add(Vec.sub(this.pos, this.anim_pos).mult(config.camera_anim_factor));
        this.anim_scale += (this.scale-this.anim_scale) * config.camera_anim_factor;
    }

    move(vec) {
        this.pos.add(vec);
        this.abs_pos.add(vec);
    }

    move_to(vec) {
        this.pos.set(vec);
        this.abs_pos.set(vec);
    }

    scale_at(pos, val) {
        this.scale *= val;
        this.pos.sub(
            Vec.sub(pos, this.pos).mult(val).add(this.pos).sub(pos),
        );
    }

    transform_canvas() {
        context.translate(this.anim_pos.x, this.anim_pos.y);
        context.scale(this.anim_scale, this.anim_scale);

        // context.scale(64,64);
        // context.translate(Math.round(this.anim_pos.x), Math.round(this.anim_pos.y));
        // context.scale(Math.round(this.anim_scale), Math.round(this.anim_scale));
        // context.scale(this.anim_scale, this.anim_scale);
    }

    to_screenspace(vec) {
        return Vec.mult(vec, this.anim_scale).add(this.anim_pos);
    }

    to_worldspace(vec) {
        return Vec.sub(vec, this.pos).div(this.scale);
    }
}
