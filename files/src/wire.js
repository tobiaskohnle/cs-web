'use strict';

class WireSegment extends Element {
    constructor() {
        super();

        this.offset = 0;
        this.anim_offset = 0;
        this.vertical = false;

        this.neighbor_segments = [];
    }

    update() {
        this.anim_offset = anim_interpolate(this.anim_offset, this.offset);
    }

    distance(pos) {
        if (this.neighbor_segments.length == 0) {
            return Infinity;
        }

        const points = this.neighbor_segments.map(wire => {
            if (this.vertical) {
                return new Vec(this.offset, wire.offset);
            }
            return new Vec(wire.offset, this.offset);
        });

        const point = this.anchor_point;
        const last_point = points[0]     || point;
        const next_point = points.last() || point;

        const sx = this.vertical ? point.x : last_point.x;
        const sy = this.vertical ? last_point.y : point.y;
        const ex = this.vertical ? point.x : next_point.x;
        const ey = this.vertical ? next_point.y : point.y;

        const distance = this.vertical ? Math.abs(pos.x-sx) : Math.abs(pos.y-sy);

        const last_distance = this.vertical ? Math.abs(pos.y-sy) : Math.abs(pos.x-sx);
        const next_distance = this.vertical ? Math.abs(pos.y-ey) : Math.abs(pos.x-ex);

        const length = this.vertical ? Math.abs(ey-sy) : Math.abs(ex-sx);

        if (last_distance < length && next_distance < length) {
            const middistance = distance - 1e-9;

            return middistance;
        }

        const mindistance = Math.min(last_distance, next_distance);

        let sidedistance = Math.max(distance, mindistance);

        if (distance > mindistance) {
            sidedistance -= 2e-9;
        }

        return sidedistance;
    }

    hitbox_rect() {
        if (this.neighbor_segments.length == 0) {
            return {
                pos: new Vec,
                size: new Vec,
            };
        }

        const neighbor_offsets = this.neighbor_segments.map(wire => wire.anim_offset);
        const min = Math.min(...neighbor_offsets);
        const max = Math.max(...neighbor_offsets);

        if (this.vertical) {
            return {
                pos: new Vec(this.offset, neighbor_offsets[0]),
                size: new Vec(0, max-min),
            };
        }

        return {
            pos: new Vec(neighbor_offsets[0], this.offset),
            size: new Vec(max-min, 0),
        };
    }

    draw() { // done
        const neighbor_offsets = this.neighbor_segments.map(wire => wire.anim_offset);
        const min = Math.min(...neighbor_offsets);
        const max = Math.max(...neighbor_offsets);

        if (this.vertical) context.fillRect(this.anim_offset - .1/2, min - .1/2, .1, max - min);
        else               context.fillRect(min - .1/2, this.anim_offset - .1/2, max - min, .1);

        this.draw_joints();
    }

    draw_joints() { // done
        context.fillStyle = '#f22';

        for (let i = 1; i < this.neighbor_segments.length-1; i++) {
            const neighbor_offset = this.neighbor_segments[i].anim_offset;

            if (this.vertical) context.fillRect(this.anim_offset - .2/2, neighbor_offset - .2/2, .2, .2);
            else               context.fillRect(neighbor_offset - .2/2, this.anim_offset - .2/2, .2, .2);
        }
    }
}
