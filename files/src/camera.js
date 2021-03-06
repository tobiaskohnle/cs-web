'use strict';

class Camera {
    constructor(pos=new Vec, scale=1) {
        this.pos = Vec.copy(pos);
        this.scale = scale;

        this.anim_pos_ = Vec.copy(pos);
        this.anim_scale_ = scale;
    }

    reset() {
        this.pos.set(new Vec);
        this.scale = cs.config.default_grid_size;
    }

    update(skip_animations=false) {
        this.anim_pos_ = View.anim_interpolate_vec(this.anim_pos_, this.pos, skip_animations||cs.config.camera_anim_factor);
        this.anim_scale_ = View.anim_interpolate(this.anim_scale_, this.scale, skip_animations||cs.config.camera_anim_factor);
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

    to_anim_screenspace(vec) {
        return Vec.mult(vec, this.anim_scale_).add(this.anim_pos_);
    }
    to_screenspace(vec) {
        return Vec.mult(vec, this.scale).add(this.pos);
    }

    to_worldspace(vec) {
        return Vec.sub(vec, this.pos).div(this.scale);
    }
}
