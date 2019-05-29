'use strict';

class Camera {
    constructor(pos=new Vec, scale=config.default_grid_size) {
        this.pos = Vec.copy(pos);
        this.scale = scale;

        this.anim_pos_ = Vec.copy(pos);
        this.anim_scale_ = scale;

        this.motion_ = new Vec;
    }

    reset() {
        this.pos.set(new Vec);
        this.scale = config.default_grid_size;
    }

    update() {
        this.pos.add(Vec.mult(this.motion_, config.camera_motion_anim_factor));
        this.motion_.mult(config.camera_motion_falloff_factor);

        this.anim_pos_ = anim_interpolate_vec(this.anim_pos_, this.pos, config.camera_anim_factor);
        this.anim_scale_ = anim_interpolate(this.anim_scale_, this.scale, config.camera_anim_factor);
    }

    move(vec) {
        this.pos.add(vec);
    }

    scale_at(pos, factor) {
        this.scale *= factor;
        this.pos.sub(Vec.sub(pos, this.pos).mult(factor).add(this.pos).sub(pos));
    }

    transform_canvas() {
        context.translate(...this.anim_pos_.xy);
        context.scale(this.anim_scale_, this.anim_scale_);
    }

    to_screenspace(vec) {
        return Vec.mult(vec, this.anim_scale_).add(this.anim_pos_);
    }

    to_worldspace(vec) {
        return Vec.sub(vec, this.pos).div(this.scale);
    }
}
