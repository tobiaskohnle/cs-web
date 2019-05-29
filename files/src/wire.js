'use strict';

class WireSegment extends Element {
    constructor(parent=null) {
        super();

        this.parent = parent;

        this.offset = 0;
        this.anim_offset_ = 0;
        this.vertical = false;

        this.last_pos_ = 0;

        this.neighbor_segments = [];

        this.connected_pos = null;
        this.anim_connected_pos_ = null;

        this.color_outline_ = Color.new(config.colors.outline);
    }

    update() {
        if (this.connected_pos) {
            if (this.vertical) this.offset = this.connected_pos.x;
            else               this.offset = this.connected_pos.y;

            this.anim_connected_pos_ = anim_interpolate_vec(this.anim_connected_pos_, this.connected_pos);
        }

        this.anim_offset_ = anim_interpolate(this.anim_offset_, this.offset);

        this.color_outline_.set_hsva(this.color());
        this.color_outline_.update();
    }

    update_last_pos() {
        this.last_pos_ = this.offset;
    }

    cancel_animation() {
        this.anim_offset_ = this.offset;
    }

    move(vec, total_vec) {
        if (this.vertical) this.offset = Math.round((this.last_pos_ + total_vec.x) / .5) * .5;
        else               this.offset = Math.round((this.last_pos_ + total_vec.y) / .5) * .5;
    }

    distance(pos) {
        if (this.neighbor_segments.length == 0) {
            return Infinity;
        }

        const pos_offset        = this.vertical ? pos.x : pos.y;
        const pos_normal_offset = this.vertical ? pos.y : pos.x;

        const distance = Math.abs(pos_offset - this.offset);
        const normal_offset = this.normal_offset();

        if (between(pos_normal_offset, normal_offset.min, normal_offset.max)) {
            const dist = distance - 1e-9;

            if (dist > 1) return Infinity;
            return dist;
        }

        let dist = Math.max(distance, normal_offset.min);

        if (distance > normal_offset.min) {
            dist -= 2e-9;
        }

        if (dist > 1) return Infinity;
        return dist;

        /*
        const points = this.neighbor_segments.map(wire => {
            if (this.vertical) {
                return new Vec(this.offset, wire.offset);
            }
            return new Vec(wire.offset, this.offset);
        });

        const point = this.vertical ? new Vec(this.offset, 0) : new Vec(0, this.offset);
        const last_point = points[0]     || point;
        const next_point = points.last() || point;

        const sx = this.vertical ? point.x : last_point.x; //
        const sy = this.vertical ? last_point.y : point.y;
        const ex = this.vertical ? point.x : next_point.x;
        const ey = this.vertical ? next_point.y : point.y;

        const distance = this.vertical ? Math.abs(pos.x-sx) : Math.abs(pos.y-sy);

        const last_distance = this.vertical ? Math.abs(pos.y-sy) : Math.abs(pos.x-sx);
        const next_distance = this.vertical ? Math.abs(pos.y-ey) : Math.abs(pos.x-ex);

        const length = this.vertical ? Math.abs(ey-sy) : Math.abs(ex-sx);

        if (last_distance < length && next_distance < length) {
            const middistance = distance - 1e-9;

            if (middistance > 1) return Infinity;
            return middistance;
        }

        const mindistance = Math.min(last_distance, next_distance);

        let sidedistance = Math.max(distance, mindistance);

        if (distance > mindistance) {
            sidedistance -= 2e-9;
        }

        if (sidedistance > 1) return Infinity;
        return sidedistance;
        */
    }

    anim_normal_offset() {
        if (this.neighbor_segments.length == 0) {
            return {min: 0, max: 0};
        }

        const neighbor_offsets = this.neighbor_segments.map(wire => wire.anim_offset_);

        if (this.connected_pos && this.anim_connected_pos_) {
            const connected_pos_offset
                = this.vertical
                ? this.anim_connected_pos_.y
                : this.anim_connected_pos_.x;
            var min = Math.min(...neighbor_offsets, connected_pos_offset);
            var max = Math.max(...neighbor_offsets, connected_pos_offset);
        }
        else {
            var min = Math.min(...neighbor_offsets);
            var max = Math.max(...neighbor_offsets);
        }

        return {min, max};
    }
    normal_offset() {
        if (this.neighbor_segments.length == 0) {
            return {min: 0, max: 0};
        }

        const neighbor_offsets = this.neighbor_segments.map(wire => wire.offset);

        if (this.connected_pos) {
            const connected_pos_offset
                = this.vertical
                ? this.connected_pos.y
                : this.connected_pos.x;
            var min = Math.min(...neighbor_offsets, connected_pos_offset);
            var max = Math.max(...neighbor_offsets, connected_pos_offset);
        }
        else {
            var min = Math.min(...neighbor_offsets);
            var max = Math.max(...neighbor_offsets);
        }

        return {min, max};
    }

    hitbox_rect() {
        const {min, max} = this.normal_offset();

        if (this.vertical) {
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

        if (this.vertical) context.fillRect(this.anim_offset_ - .1/2, min - .1/2, .1, max - min + .2/2);
        else               context.fillRect(min - .1/2, this.anim_offset_ - .1/2, max - min + .2/2, .1);

        this.draw_joints();
    }

    draw_joints() {
        context.fillStyle = '#f22';

        const neighbor_segments = [...this.neighbor_segments].sort((a,b) => b.anim_offset_-a.anim_offset_);

        for (let i = 1; i < neighbor_segments.length-1; i++) {
            const neighbor_offset = neighbor_segments[i].anim_offset_;

            if (this.vertical) context.fillRect(this.anim_offset_ - .4/2, neighbor_offset - .4/2, .4, .4);
            else               context.fillRect(neighbor_offset - .4/2, this.anim_offset_ - .4/2, .4, .4);
        }
    }
}
