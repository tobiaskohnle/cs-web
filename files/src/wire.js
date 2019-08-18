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

        this.anim_color_ = Color.from(cs.theme.outline);
        this.base_color_ = Color.from(cs.theme.outline);
    }

    update(skip_animations=false) {
        if (this.offset_pos) {
            this.set_offset(this.offset_pos);
        }
        this.anim_offset_pos_ = View.anim_interpolate_vec(this.anim_offset_pos_, this.offset_pos, skip_animations);
        this.anim_normal_pos_ = View.anim_interpolate_vec(this.anim_normal_pos_, this.normal_pos, skip_animations);

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

        this.anim_offset_ = View.anim_interpolate(this.anim_offset_, this.offset, skip_animations);

        const default_color = this.parent() && this.parent().state ? cs.theme.wire_active : cs.theme.wire_inactive;

        this.apply_current_color(this.anim_color_, default_color);
        this.anim_color_.update(skip_animations);

        this.base_color_.hsva(default_color);
        this.base_color_.update(skip_animations);
    }

    update_last_pos() {
        this.last_offset_ = this.offset;
    }

    resize() {}

    move(total_vec, snap_size) {
        this.set_offset(Vec.round(total_vec, snap_size));
        this.offset += Util.round(this.last_offset_, this.snap_size_);
    }

    parent() {
        return ActionUtil.all_elements().find(element => element instanceof OutputNode && element.wire_segments.includes(this));
    }

    attached_connection_node() {
        const parent = this.parent();
        if (!parent) {
            return;
        }

        const nodes = [parent, ...parent.next_nodes];

        return nodes.find(node => this.is_connected_to(node));
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
                element: neighbor_segment,
            });
        }
        if (this.normal_pos) {
            if (!this.anim_normal_pos_) {
                this.anim_normal_pos_ = Vec.copy(this.normal_pos);
            }
            neighbor_elements.push({
                offset: this.is_vertical ? this.normal_pos.y : this.normal_pos.x,
                anim_offset_: this.is_vertical ? this.anim_normal_pos_.y : this.anim_normal_pos_.x,
                element: this.attached_connection_node(),
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

        context.strokeStyle = this.anim_color_.to_string();
        context.lineWidth = this.is_pressed() ? cs.config.line_width-.02 : cs.config.line_width;
        context.lineCap = 'square';

        context.beginPath();
        context.moveTo(...Vec.from_offset(this.is_vertical, this.anim_offset_, min).xy);
        context.lineTo(...Vec.from_offset(this.is_vertical, this.anim_offset_, max).xy);
        context.stroke();

        context.fillStyle = this.base_color_.to_string();

        const neighbor_elements = this.neighbor_elements().sorted(Util.compare_function(x=>x.anim_offset_));

        for (let i = 1; i < neighbor_elements.length-1; i++) {
            const intersection = Vec.from_offset(this.is_vertical, this.anim_offset_, neighbor_elements[i].anim_offset_);

            switch (cs.config.wire_joints_style) {
                case 'square':
                    const wire_joint_size = new Vec(cs.config.wire_joints_square_radius*2);
                    context.fillRect(...Vec.sub(intersection, Vec.div(wire_joint_size, 2)).xy, ...wire_joint_size.xy);
                        break;

                case 'round':
                    context.beginPath();
                    context.arc(...intersection.xy, cs.config.wire_joints_round_radius, 0, Math.PI*2);
                    context.fill();
                    break;
            }
        }
    }
}
