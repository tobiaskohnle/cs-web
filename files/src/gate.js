'use strict';

class Gate extends Element {
    constructor(pos=new Vec, size=new Vec(3,4), tag=null) {
        console.assert(new.target != Gate, 'illegal constructor @Gate.constructor');
        super();

        this.update_priority_ = 2;

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.tag = tag;

        this.inputs = [];
        this.outputs = [];

        this.color_outline_ = new Color;
        this.color_outline_.set_hsva(config.colors.outline);
    }

    allow_new_input_nodes() {
        return false;
    }

    add_input_node() {
        const node = new InputNode(this, this.nodes_per_side()[Enum.side.west].length);
        this.inputs.push(node);
        return node;
    }
    add_output_node() {
        const node = new OutputNode(this, this.nodes_per_side()[Enum.side.east].length);
        this.outputs.push(node);
        return node;
    }

    remove_input_node(node) {
        node.clear();
        this.inputs.remove(node);
    }
    remove_output_node() {
        node.clear();
        this.outputs.remove(node);
    }

    cancel_animation() {
        super.cancel_animation();

        for (const node of this.nodes()) {
            node.cancel_animation();
        }
    }

    nodes() {
        return [...this.inputs, ...this.outputs];
    }

    nodes_init_animation() {
        this.set_nodes_pos();

        for (const node of this.nodes())  {
            node.anim_pos_.add(node.dir);
        }
    }

    nodes_per_side() {
        const nodes = [[],[],[],[]];

        for (const node of this.nodes()) {
            nodes[side_index(node.dir)].push(node);
        }

        return nodes;
    }

    set_nodes_pos() {
        const set_pos = (node, side_index, relative_offset) => {
            const width  = new Vec(this.size.x, 0);
            const height = new Vec(0, this.size.y);

            switch (side_index) {
                case 0: node.pos.set(Vec.add(this.pos, width).add(Vec.mult(height, relative_offset))); break;
                case 1: node.pos.set(Vec.add(this.pos, height).add(Vec.mult(width, relative_offset))); break;
                case 2: node.pos.set(Vec.add(this.pos, Vec.mult(height, relative_offset))); break;
                case 3: node.pos.set(Vec.add(this.pos, Vec.mult(width,  relative_offset))); break;
            }
        }

        this.nodes_per_side().forEach((nodes, i) => {
            for (const node of nodes) {
                set_pos(node, i, 1/2/nodes.length * (1 + node.index*2));
            }
        });
    }

    get_dir(pos) {
        const center = Vec.add(this.pos, Vec.div(this.size, 2));
        const delta = Vec.sub(pos, center);

        if ((this.size.y-this.size.x) / 2 > Math.abs(delta.y) - Math.abs(delta.x)) {
            return new Vec(delta.x>0 ? 1 : -1, 0);
        }
        else {
            return new Vec(0, delta.y>0 ? 1 : -1);
        }
    }

    update() {
        super.update_pos();
        super.update_size();

        for (const nodes of this.nodes_per_side()) {
            nodes.sorted((a,b) => a.index-b.index).forEach((node, i) => {
                node.index = i;
            });
        }

        this.set_nodes_pos();

        this.color_outline_.set_hsva(this.current_color());
        this.color_outline_.update();
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
        this.last_size_ = Vec.copy(this.size);
    }

    move(total_vec, snap_size_) {
        super.snap_pos(this.last_pos_, total_vec, snap_size_);
    }

    hitbox_rect() {
        return {
            pos: this.pos,
            size: this.size,
        };
    }

    draw_nodes() {
        for (const input of this.inputs) {
            input.draw();
        }
        for (const output of this.outputs) {
            output.draw();
        }
    }

    is_pressed() {
        return this.is_hovered() && current_tab.controller.is_mouse_down;
    }

    draw_outline() {
        context.strokeStyle = this.color_outline_.to_string();
        context.lineWidth = .1;

        if (this.is_pressed()) {
            context.lineWidth = .12;
            context.strokeRect(...Vec.add(this.anim_pos_, new Vec(.1/2)).xy, ...Vec.sub(this.anim_size_, new Vec(.2/2)).xy);
        }
        else {
            context.strokeRect(...this.anim_pos_.xy, ...this.anim_size_.xy);
        }
    }

    draw_tag() {
        if (this.tag) {
            context.font = '2px consolas, monospace';
            context.fillStyle = config.colors.wire_inactive.to_string();
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(this.tag, ...Vec.add(this.anim_pos_, Vec.div(this.anim_size_, 2)).xy);
        }
    }

    draw() {
        this.draw_nodes();
        this.draw_outline();
        this.draw_tag();
    }

    distance(pos) {
        if (between(pos.x, this.pos.x, this.pos.x+this.size.x) &&
            between(pos.y, this.pos.y, this.pos.y+this.size.y)
        ) {
            return 0;
        }

        return Infinity;
    }
}

class AndGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '&');
        this.add_input_node();
        this.add_input_node();
        this.add_output_node();
    }

    allow_new_input_nodes() {
        return true;
    }

    eval_state() {
        for (const input of this.inputs) {
            if (!input.state) {
                return false;
            }
        }
        return true;
    }
}
class OrGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '\u22651');
        this.add_input_node();
        this.add_input_node();
        this.add_output_node();
    }

    allow_new_input_nodes() {
        return true;
    }

    eval_state() {
        for (const input of this.inputs) {
            if (input.state) {
                return true;
            }
        }
        return false;
    }
}
class XorGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '=1');
        this.add_input_node();
        this.add_input_node();
        this.add_output_node();
    }

    allow_new_input_nodes() {
        return true;
    }

    eval_state() {
        let state = false;

        for (const input of this.inputs) {
            state = state != input.state;
        }
        return state;
    }
}
class NopGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '1');
        this.add_input_node();
        this.add_output_node();
    }

    eval_state() {
        for (const input of this.inputs) {
            return input.state;
        }
        return false;
    }
}

class CustomGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '');

        this.inner_elements = [];
    }
}

class InputSwitch extends Gate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_output_node();

        this.is_enabled = false;

        this.color_fill_ = Color.from(config.colors.light_inactive);
    }

    toggle() {
        this.is_enabled = !this.is_enabled;
    }

    eval_state() {
        return this.is_enabled;
    }

    update() {
        if (this.eval_state()) {
            this.color_fill_.set_hsva(config.colors.light_active);
        }
        else {
            this.color_fill_.set_hsva(config.colors.light_inactive);
        }
        this.color_fill_.update();

        super.update();
    }

    draw() {
        context.fillStyle = this.color_fill_.to_string();
        context.fillRect(...this.anim_pos_.xy, ...this.anim_size_.xy);

        super.draw();
    }
}

class InputButton extends Gate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_output_node();

        this.is_enabled = false;

        this.color_fill_ = Color.from(config.colors.light_inactive);
    }

    mouse_down() {
        this.is_enabled = true;
        current_tab.model.queue_tick(this.outputs[0]);
    }
    mouse_up() {
        this.is_enabled = false;
        current_tab.model.queue_tick(this.outputs[0]);
    }

    eval_state() {
        return this.is_enabled;
    }

    update() {
        if (this.eval_state()) {
            this.color_fill_.set_hsva(config.colors.light_active);
        }
        else {
            this.color_fill_.set_hsva(config.colors.light_inactive);
        }
        this.color_fill_.update();

        super.update();
    }

    draw() {
        super.draw_nodes();

        context.strokeStyle = this.color_outline_.to_string();
        context.lineWidth = .1;

        const radius = .33;

        context.beginPath();

        const pos = this.is_pressed() ? Vec.add(this.anim_pos_, new Vec(.1/2)) : this.anim_pos_;
        const size = this.is_pressed() ? Vec.sub(this.anim_size_, new Vec(.2/2)) : this.anim_size_;

        context.moveTo(
            pos.x, pos.y + size.y/2,
        );
        context.arcTo(
            pos.x, pos.y,
            pos.x + size.x/2, pos.y,
            radius,
        );
        context.arcTo(
            pos.x + size.x, pos.y,
            pos.x + size.x, pos.y + size.y/2,
            radius,
        );
        context.arcTo(
            pos.x + size.x, pos.y + size.y,
            pos.x + size.x/2, pos.y + size.y,
            radius,
        );
        context.arcTo(
            pos.x, pos.y + size.y,
            pos.x, pos.y + size.y/2,
            radius,
        );

        context.fillStyle = this.color_fill_.to_string();
        context.fill();

        context.closePath();
        context.stroke();
    }
}

class InputPulse extends Gate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_output_node();

        this.pulse_length = config.default_rising_edge_pulse_length;
        this.pulse_ticks_ = Infinity;
    }

    mouse_down() {
        if (!this.outputs[0].is_inverted) {
            this.pulse_ticks_ = 0;
            current_tab.model.queue_tick(this.outputs[0]);
        }
    }
    mouse_up() {
        if (this.outputs[0].is_inverted) {
            this.pulse_ticks_ = 0;
            current_tab.model.queue_tick(this.outputs[0]);
        }
    }

    eval_state() {
        if (this.outputs[0].is_inverted) {
            return !(this.pulse_ticks_++ < this.pulse_length);
        }

        return this.pulse_ticks_++ < this.pulse_length;
    }

    update() {
        super.update();
    }

    draw() {
        super.draw();

        context.beginPath();
        context.lineWidth = .1;

        context.moveTo(this.anim_pos_.x, this.anim_pos_.y);
        context.lineTo(this.anim_pos_.x+1.2, this.anim_pos_.y+this.anim_size_.y/2);
        context.lineTo(this.anim_pos_.x, this.anim_pos_.y+this.anim_size_.y);

        context.stroke();
    }
}

class Clock extends Gate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_output_node();

        this.pulse_length = 6000;
        this.pulse_width = 3000;
        this.pulse_ticks_ = 0;
    }

    eval_state() {
        this.pulse_ticks_ = mod(this.pulse_ticks_+1, this.pulse_length);
        return this.pulse_ticks_ < this.pulse_width;
    }

    update() {
        super.update();
    }

    draw() {
        super.draw();

        context.beginPath();
        context.lineWidth = .1;

        context.moveTo(this.anim_pos_.x,                      this.anim_pos_.y+this.anim_size_.y/2);
        context.lineTo(this.anim_pos_.x+.3,                   this.anim_pos_.y+this.anim_size_.y/2);
        context.lineTo(this.anim_pos_.x+.3,                   this.anim_pos_.y+this.anim_size_.y/2+.6);
        context.lineTo(this.anim_pos_.x+this.anim_size_.x/2,  this.anim_pos_.y+this.anim_size_.y/2+.6);
        context.lineTo(this.anim_pos_.x+this.anim_size_.x/2,  this.anim_pos_.y+this.anim_size_.y/2-.6);
        context.lineTo(this.anim_pos_.x+this.anim_size_.x-.3, this.anim_pos_.y+this.anim_size_.y/2-.6);
        context.lineTo(this.anim_pos_.x+this.anim_size_.x-.3, this.anim_pos_.y+this.anim_size_.y/2);
        context.lineTo(this.anim_pos_.x+this.anim_size_.x,    this.anim_pos_.y+this.anim_size_.y/2);

        context.stroke();
    }
}

class OutputLight extends Gate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_input_node();

        this.color_fill_ = Color.from(config.colors.light_inactive);
    }

    eval_state() {
        return this.inputs[0].state;
    }

    update() {
        if (this.eval_state()) {
            this.color_fill_.set_hsva(config.colors.light_active);
        }
        else {
            this.color_fill_.set_hsva(config.colors.light_inactive);
        }

        this.color_fill_.update();

        super.update();
    }

    draw() {
        context.fillStyle = this.color_fill_.to_string();
        context.fillRect(...this.anim_pos_.xy, ...this.anim_size_.xy);

        super.draw();
    }
}

class SegmentDisplay extends Gate {
    constructor(pos) {
        super(pos, new Vec(5,7));
        this.add_input_node();
        this.add_input_node();
        this.add_input_node();
        this.add_input_node();
        this.add_input_node();
        this.add_input_node();
        this.add_input_node();

        this.color_segments_ = [
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
            Color.from(config.colors.segment_inactive),
        ];

        this.options_ = {
            scale:                 .0026,
            skew:                  -30,
            width:                 450,
            segment_width:         105,
            segment_distance:      21,
            segment_center_length: 70,
        };
    }

    update() {
        for (let i = 0; i < 7; i++) {
            if (this.inputs[i].state) {
                this.color_segments_[i].set_hsva(config.colors.segment_active);
            }
            else {
                this.color_segments_[i].set_hsva(config.colors.segment_inactive);
            }

            this.color_segments_[i].update();
        }

        super.update();
    }

    draw() {
        super.draw();

        const X = 1;
        const Y = 2;

        const scale                 = this.options_.scale * Math.min(this.anim_size_.x/5, this.anim_size_.y/7);
        const skew                  = this.options_.skew;
        const width                 = this.options_.width;
        const segment_width         = this.options_.segment_width;
        const segment_distance      = this.options_.segment_distance;
        const segment_center_length = this.options_.segment_center_length;

        const center = Vec.add(this.anim_pos_, Vec.div(this.anim_size_, 2));

        const inner_width = width - segment_width*2;
        const height = width*2 - segment_width;

        const C0 = new Vec(inner_width/2 + segment_center_length, 0                            );
        const M0 = new Vec(width/2,                               0                            );
        const M1 = new Vec(width/2,                               height/2                     );
        const I0 = new Vec(inner_width/2,                         segment_width/2              );
        const I1 = new Vec(inner_width/2,                         segment_width/2 + inner_width);
        const A0 = new Vec(inner_width/2 + segment_center_length, height/2                     );
        const A1 = new Vec(width/2,                               height/2 - segment_width/3.2 );

        const points_corner = [
            I0, C0, M0, A1, A0, I1,
        ];
        const points_side = [
            I1, A0,
            Vec.mirror(A0, Y),
            Vec.mirror(I1, Y),
        ];
        const points_center = [
            C0, I0,
            Vec.mirror(I0, Y),
            Vec.mirror(C0, Y),
            Vec.mirror(I0, X|Y),
            Vec.mirror(I0, X),
        ];

        const transform_point = vec => {
            return new Vec(
                center.x + (vec.x + vec.y*skew/(width-segment_width/2)) * scale,
                center.y + (vec.y                                     ) * scale,
            );
        }

        const intersection_point = (prev, next, point, scalar=1) => {
            const prev_vector = Vec.sub(prev, point);
            const next_vector = Vec.sub(next, point);
            const angle = Math.atan2(prev_vector.y, prev_vector.x) - Math.atan2(next_vector.y, next_vector.x);

            const d = segment_distance/2 / Math.sin((Math.PI-angle) * scalar);
            const prev_normalized = Vec.mult(prev_vector, d / Vec.length(prev_vector));
            const next_normalized = Vec.mult(next_vector, d / Vec.length(next_vector));

            const center = Vec.mult(Vec.add(prev_normalized, next_normalized), .5);
            return Vec.add(Vec.mult(Vec.sub(point, center), 2), point);
        }

        const add_path = (points, mirror_flags, scalar, color) => {
            points = points.map((vec, i) => Vec.mirror(vec, mirror_flags));

            context.beginPath();

            for (let i = 0; i < points.length; i++) {
                const last_i = mod(i-1, points.length);
                const next_i = mod(i+1, points.length);

                const transformed_point = transform_point(intersection_point(
                    points[last_i],
                    points[next_i],
                    points[i],
                    scalar,
                ));

                if (i == 0) context.moveTo(...transformed_point.xy);
                else        context.lineTo(...transformed_point.xy);
            }

            context.fillStyle = color.to_string();
            context.fill();
        }

        add_path(points_corner, 0  , -1, this.color_segments_[2]);
        add_path(points_corner, Y  ,  1, this.color_segments_[4]);
        add_path(points_corner, X  ,  1, this.color_segments_[1]);
        add_path(points_corner, X|Y, -1, this.color_segments_[5]);

        add_path(points_side  , 0  , -1, this.color_segments_[3]);
        add_path(points_side  , X  ,  1, this.color_segments_[0]);
        add_path(points_center, 0  , -1, this.color_segments_[6]);
    }
}
