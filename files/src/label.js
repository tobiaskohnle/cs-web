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

        this.caret_index = 0;
        this.selection_index = 0;

        this.anim_caret_index_ = 0;
        this.anim_selection_index_ = 0;

        this.text = '';
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    update() {
        super.update_pos();
        super.update_size();
    }

    special_info() {
        if (/^tag\s*=/i.test(this.text)) {
            return {tag: this.text.match(/^tag\s*=\s*(?<tag>\w*)\s*/i).groups.tag};
        }

        if (/^name\s*=/i.test(this.text)) {
            return {name: this.text.match(/^name\s*=\s*(?<name>\w*)\s*/i).groups.name};
        }

        if (/^size\s*=/i.test(this.text)) {
            if (/^size\s*=\d+,\d+/i.test(this.text)) {
                const size = this.text.match(/^size\s*=\s*(?<x>\d+)\s*,\s*(?<y>\d+)\s*/i).groups;
                return {size: new Vec(parseInt(size.x), parseInt(size.y))};
            }

            return {size: new Vec(3,4)};
        }

        return null;
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
