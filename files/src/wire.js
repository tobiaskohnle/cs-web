'use strict';

class WireSegment extends Element {
    constructor(parent=null) {
        super();

        this.parent = parent;

        this.offset = 0;
        this.anim_offset_ = 0;
        this.is_vertical = false;

        this.last_pos_ = 0;

        this.neighbor_segments = [];

        this.connected_pos = null;
        this.anim_connected_pos_ = null;

        this.color_outline_ = Color.new(config.colors.outline);
    }

    update() {
        if (this.connected_pos) {
            if (this.is_vertical) this.offset = this.connected_pos.x;
            else               this.offset = this.connected_pos.y;

            this.anim_connected_pos_ = anim_interpolate_vec(this.anim_connected_pos_, this.connected_pos);
        }
        else {
            this.anim_connected_pos_ = null;
        }

        this.anim_offset_ = anim_interpolate(this.anim_offset_, this.offset);

        const default_color = this.parent && this.parent.state ? config.colors.wire_active : config.colors.wire_inactive;
        this.color_outline_.set_hsva(this.color(default_color));
        this.color_outline_.update();
    }

    update_last_pos() {
        this.last_pos_ = this.offset;
    }

    cancel_animation() {
        this.anim_offset_ = this.offset;
    }

    move(vec, total_vec) {
        if (this.is_vertical) this.offset = Math.round((this.last_pos_ + total_vec.x) / .5) * .5;
        else               this.offset = Math.round((this.last_pos_ + total_vec.y) / .5) * .5;
    }

    distance(pos) {
        if (this.neighbor_segments.length == 0) {
            return Infinity;
        }

        return WireSegment.distance(pos, this.is_vertical, this.offset, this.normal_offset());
    }

    static distance(pos, is_vertical, offset, normal_offset) {
        const pos_offset        = is_vertical ? pos.x : pos.y;
        const pos_normal_offset = is_vertical ? pos.y : pos.x;

        const distance = Math.abs(pos_offset - offset);

        if (between(pos_normal_offset, normal_offset.min, normal_offset.max)) {
            const mid_distance = distance - 2e-9;

            if (mid_distance > 1) return Infinity;
            return mid_distance;
        }

        const min_distance = Math.min(
            Math.abs(normal_offset.min-pos_normal_offset),
            Math.abs(normal_offset.max-pos_normal_offset),
        );

        let side_distance = Math.max(distance, min_distance);

        if (distance > min_distance) {
            side_distance -= 1e-9;
        }

        if (side_distance > 1) return Infinity;
        return side_distance;
    }

    neighbor_elements() {
        const neighbor_elements = [];

        for (const neighbor_segment of this.neighbor_segments) {
            neighbor_elements.push({
                offset: neighbor_segment.offset,
                anim_offset_: neighbor_segment.anim_offset_,
            });
        }
        if (this.connected_pos) {
            neighbor_elements.push({
                offset: this.is_vertical ? this.connected_pos.y : this.connected_pos.x,
                anim_offset_: this.is_vertical ? this.anim_connected_pos_.y : this.anim_connected_pos_.x,
            });
        }

        return neighbor_elements;
    }

    anim_normal_offset() {
        const neighbor_offsets = this.neighbor_elements().map(wire => wire.anim_offset_);
        const min = Math.min(...neighbor_offsets);
        const max = Math.max(...neighbor_offsets);

        return {min, max};
    }
    normal_offset() {
        const neighbor_offsets = this.neighbor_elements().map(wire => wire.offset);
        const min = Math.min(...neighbor_offsets);
        const max = Math.max(...neighbor_offsets);

        return {min, max};
    }

    hitbox_rect() {
        const {min, max} = this.normal_offset();

        if (this.is_vertical) {
            return {
                pos: new Vec(this.offset, min),
                size: new Vec(0, max-min),
            };
        }

        return {
            pos: new Vec(min, this.offset),
            size: new Vec(max-min, 0),
        };
    }

    draw() {
        const {min, max} = this.anim_normal_offset();

        context.fillStyle = this.color_outline_.to_string();

        if (this.is_vertical) context.fillRect(this.anim_offset_ - .1/2, min - .1/2, .1, max - min + .2/2);
        else               context.fillRect(min - .1/2, this.anim_offset_ - .1/2, max - min + .2/2, .1);

        this.draw_joints();
    }

    draw_joints() {
        context.fillStyle = '#ff2';

        const neighbor_elements = [...this.neighbor_elements()].sort((a,b) => b.anim_offset_-a.anim_offset_);

        for (let i = 1; i < neighbor_elements.length-1; i++) {
            const neighbor_offset = neighbor_elements[i].anim_offset_;

            if (this.is_vertical) context.fillRect(this.anim_offset_ - .4/2, neighbor_offset - .4/2, .4, .4);
            else               context.fillRect(neighbor_offset - .4/2, this.anim_offset_ - .4/2, .4, .4);
        }
    }
}
