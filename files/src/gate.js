'use strict';

class Gate extends Element {
    constructor(pos=new Vec, size=new Vec(3,4), tag=null) {
        console.assert(new.target != Gate, 'illegal constructor @Gate.constructor');
        super();

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.label = null;
        this.tag = tag;

        this.inputs = [];
        this.outputs = [];

        this.color_outline_ = new Color;
        this.color_outline_.set_hsva(config.colors.outline);
    }

    add_input_node() {
        const node = new InputNode(this, this.inputs.length);
        this.inputs.push(node);
        return node;
    }
    add_output_node() {
        const node = new OutputNode(this, this.outputs.length);
        this.outputs.push(node);
        return node;
    }

    clear_nodes() {
        for (const node of this.nodes()) {
            node.clear();
        }
    }

    cancel_animation() {
        for (const node of this.nodes()) {
            node.cancel_animation();
        }

        super.cancel_animation();
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
        const index = dir => {
            if (dir.x > 0) return 0;
            if (dir.y > 0) return 1;
            if (dir.x < 0) return 2;
            if (dir.y < 0) return 3;
        }

        const nodes = [[],[],[],[]];

        for (const node of this.nodes()) {
            nodes[index(node.dir)].push(node);
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

    update_all_nodes() {
        for (const node of this.nodes()) {
            node.update();
        }
    }

    update() {
        super.update_pos();
        super.update_size();

        this.set_nodes_pos();

        this.update_all_nodes();

        this.color_outline_.set_hsva(this.color());
        this.color_outline_.update();
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    hitbox_rect() {
        return {
            pos: this.pos,
            size: this.size,
        };
    }

    draw() {
        for (const input of this.inputs) {
            input.draw();
        }
        for (const output of this.outputs) {
            output.draw();
        }

        context.strokeStyle = this.color_outline_.to_string();
        context.lineWidth = .1;

        if (this.is_hovered() && current_tab.controller.mouse_down) {
            context.lineWidth = .12;
            context.strokeRect(...Vec.add(this.anim_pos_, new Vec(.1/2)).xy, ...Vec.sub(this.anim_size_, new Vec(.2/2)).xy);
        }
        else {
            context.strokeRect(...this.anim_pos_.xy, ...this.anim_size_.xy);
        }

        // context.setLineDash([]);

        context.font = '2px consolas, monospace';
        context.fillStyle = config.colors.wire_inactive.to_string();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // context.fillText(this.tag, this.anim_pos_.x+this.anim_size_.x/2, this.anim_pos_.y+this.anim_size_.y/2, this.anim_size_.y);
        context.fillText(this.tag, ...Vec.add(this.anim_pos_, Vec.div(this.anim_size_, 2)).xy);
    }

    distance(pos) {
        if (between(pos.x, this.pos.x, this.pos.x+this.size.x) &&
            between(pos.y, this.pos.y, this.pos.y+this.size.y)
        ) {
            return 0;
        }

        return Infinity;
    }

    move(vec, total_vec) {
        this.pos.set(this.last_pos_).add(total_vec).round();
    }
}

class AndGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '&');
        this.add_input_node();
        this.add_input_node();
        this.add_output_node();
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

    eval_state() {
        for (const input of this.inputs) {
            if (input.state) {
                return true;
            }
        }
        return false;
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

class ModelGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '');
    }
}

class CustomGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '');

        this.inner_elements = [];
    }
}

class InputSwitch extends ModelGate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_output_node();

        this.is_enabled = false;

        this.color_fill_ = Color.new(config.colors.light_inactive);
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

class OutputLight extends ModelGate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.add_input_node();

        this.color_fill_ = Color.new(config.colors.light_inactive);
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

class SegmentDisplay extends ModelGate {
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
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
            Color.new(config.colors.segment_inactive),
        ];
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

        const scale                 = .0026 * Math.min(this.anim_size_.x/5, this.anim_size_.y/7);
        const skew_x                = -30;
        const width                 = 450;
        const segment_width         = 105;
        const segment_distance      = 21;
        const segment_center_length = 70;

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
                center.x + (vec.x + vec.y*skew_x/(width-segment_width/2)) * scale,
                center.y + (vec.y                                       ) * scale,
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
