'use strict';

class WireSegment extends Element {
    constructor() {
        super();

        this.offset = 0;
        this.anim_offset_ = 0;
        this.is_vertical = false;

        this.last_offset_ = 0;

        this.snap_size_ = .5;

        this.neighbor_segments = [];

        this.offset_pos = null;
        this.normal_pos = null;
        this.anim_offset_pos_ = null;
        this.anim_normal_pos_ = null;

        this.color_outline_ = Color.from(cs.theme.outline);
    }

    update() {
        if (this.offset_pos) {
            this.set_offset(this.offset_pos);
        }
        this.anim_offset_pos_ = anim_interpolate_vec(this.anim_offset_pos_, this.offset_pos);
        this.anim_normal_pos_ = anim_interpolate_vec(this.anim_normal_pos_, this.normal_pos);

        if (this.auto_offset_ &&
            this.neighbor_segments.length == 2 &&
            this.neighbor_segments[0].normal_pos &&
            this.neighbor_segments[1].normal_pos
        ) {
            let avg = 0;

            const offset_a = this.is_vertical
                ? this.neighbor_segments[0].normal_pos.x
                : this.neighbor_segments[0].normal_pos.y;
            avg += offset_a / 2;

            const offset_b = this.is_vertical
                ? this.neighbor_segments[1].normal_pos.x
                : this.neighbor_segments[1].normal_pos.y;
            avg += offset_b / 2;

            this.offset = avg;
        }

        this.anim_offset_ = anim_interpolate(this.anim_offset_, this.offset);

        const default_color = this.parent() && this.parent().state ? cs.theme.wire_active : cs.theme.wire_inactive;
        this.color_outline_.set_hsva(this.current_color(default_color));
        this.color_outline_.update();
    }

    update_last_pos() {
        this.last_offset_ = this.offset;
    }

    move(total_vec, snap_size) {
        this.set_offset(Vec.round(total_vec, snap_size));
        this.offset += Util.round(this.last_offset_, this.snap_size_);
    }

    parent() {
        return ActionGet.all_elements().find(element => element instanceof OutputNode && element.wire_segments.includes(this));
    }

    set_offset(pos) {
        if (this.is_vertical) this.offset = pos.x;
        else                  this.offset = pos.y;
    }

    set_connected_pos(pos) {
        this.offset_pos = this.normal_pos = pos;
    }

    is_connected_to(node) {
        return this.offset_pos == node.anchor_pos_
            && this.normal_pos == node.anchor_pos_;
    }

    cancel_animation() {
        this.update();
        this.anim_offset_ = this.offset;
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

        if (Util.between(pos_normal_offset, normal_offset.min, normal_offset.max)) {
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
        if (this.normal_pos) {
            neighbor_elements.push({
                offset: this.is_vertical ? this.normal_pos.y : this.normal_pos.x,
                anim_offset_: this.is_vertical ? this.anim_normal_pos_.y : this.anim_normal_pos_.x,
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
        else                  context.fillRect(min - .1/2, this.anim_offset_ - .1/2, max - min + .2/2, .1);

        this.draw_joints();
    }

    draw_joints() {
        context.fillStyle = cs.theme.wire_joint.to_string();

        const neighbor_elements = this.neighbor_elements().sorted((a,b) => a.anim_offset_-b.anim_offset_);

        for (let i = 1; i < neighbor_elements.length-1; i++) {
            const neighbor_offset = neighbor_elements[i].anim_offset_;

            if (this.is_vertical) context.fillRect(this.anim_offset_ - .4/2, neighbor_offset - .4/2, .4, .4);
            else                  context.fillRect(neighbor_offset - .4/2, this.anim_offset_ - .4/2, .4, .4);
        }
    }
}
