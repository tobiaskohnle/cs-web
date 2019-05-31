'use strict';

class Label extends Element {
    constructor(pos=new Vec, size=new Vec) {
        super();

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.font_size = .7;
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    draw() {
        context.fillStyle = '#fa77';
        context.fillRect(...this.anim_pos_.xy, ...this.anim_size_.xy);
    }

    distance(pos) {
        if (between(pos.x, this.pos.x, this.pos.x+this.size.x) &&
            between(pos.y, this.pos.y, this.pos.y+this.size.y)
        ) {
            return 0;
        }

        return Infinity;
    }

    update() {
        super.update_pos();
        super.update_size();
    }

    hitbox_rect() {
        return {
            pos: this.pos,
            size: this.size,
        };
    }

    move(vec, total_vec) {
        this.pos.set(this.last_pos_).add(total_vec).round();
    }
}
