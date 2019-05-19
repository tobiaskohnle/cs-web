'use strict';

class Gate extends Element {
    constructor(pos=new Vec, size=new Vec(3,4), tag=null) {
        console.assert(new.target != Gate, 'illegal constructor @Gate.constructor');

        super();
        this.pos = pos;
        this.size = size;
        this.anim_pos = Vec.copy(pos);
        this.anim_size = Vec.copy(size);

        this.last_pos = Vec.copy(pos);

        this.label = null;
        this.tag = tag;

        this.inputs = [];
        this.outputs = [];

        this.update();
    }

    clear_nodes() {
        for (const input of this.inputs) {
            input.clear();
        }
        for (const output of this.outputs) {
            output.clear();
        }
    }

    update_last_pos() {
        this.last_pos = Vec.copy(this.pos);
    }

    update_nodes(nodes, offset) {
        let i = 0;

        for (const node of nodes) {
            const unit = this.size.y / nodes.length / 2;
            const y = this.pos.y + unit * (1 + i++*2);

            node.pos = new Vec(this.pos.x+offset, y);
        }
    }

    update() {
        super.update_pos();
        super.update_size();

        this.update_nodes(this.inputs, 0);
        this.update_nodes(this.outputs, this.size.x);

        this.anim_size = anim_interpolate_vec(this.anim_size, this.size);
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

        context.strokeStyle = config.colors.outline;

        const is_hovered = this == current_tab.controller.current_hovered_element;

        let pressed = false;

        if (is_hovered) {
            context.strokeStyle = config.colors.hovered;
        }
        if (this.is_selected()) {
            context.strokeStyle = config.colors.selected;

            // context.strokeStyle = '#117e';
            // context.setLineDash([1]);
            // context.lineDashOffset = Date.now()/700 % 2;
            if (is_hovered) {
                context.strokeStyle = config.colors.hovered_selected;

                if (current_tab.controller.mouse_down) {
                    pressed = true;
                }
            }
        }

        context.lineWidth = .1;
        if (pressed) {
            context.lineWidth = .12;
            context.strokeRect(this.anim_pos.x+.1/2, this.anim_pos.y+.1/2, this.anim_size.x-.2/2, this.anim_size.y-.2/2);
        }
        else {
            context.strokeRect(this.anim_pos.x, this.anim_pos.y, this.anim_size.x, this.anim_size.y);
        }

        context.setLineDash([]);

        context.font = '2px consolas, monospace';
        context.fillStyle = config.colors.wire_inactive;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.tag, this.anim_pos.x+this.anim_size.x/2, this.anim_pos.y+this.anim_size.y/2, this.anim_size.y);
    }

    distance(pos) {
        if (   this.pos.x < pos.x
            && this.pos.y < pos.y
            && pos.x < this.pos.x+this.size.x
            && pos.y < this.pos.y+this.size.y
        ) {
            return 0;
        }

        return Infinity;
    }

    move(vec, total_vec) {
        this.pos.set(this.last_pos).add(total_vec).round();
    }
}

class AndGate extends Gate {
    constructor(pos, size) {
        super(pos, size, '&');
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.outputs.push(new OutputNode(this));
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
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.outputs.push(new OutputNode(this));
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
        this.inputs.push(new InputNode(this));
        this.outputs.push(new OutputNode(this));
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
        this.outputs.push(new OutputNode(this));

        this.is_enabled = false;
    }

    toggle() {
        this.is_enabled = !this.is_enabled;
    }

    eval_state() {
        return this.is_enabled;
    }

    draw() {
        context.fillStyle = this.eval_state() ? config.colors.light_active : config.colors.light_inactive;
        context.fillRect(this.anim_pos.x, this.anim_pos.y, this.size.x, this.size.y);

        super.draw();
    }
}

class OutputLight extends ModelGate {
    constructor(pos) {
        super(pos, new Vec(2,2));
        this.inputs.push(new InputNode(this));
    }

    eval_state() {
        return this.inputs[0].state;
    }

    draw() {
        context.fillStyle = this.eval_state() ? config.colors.light_active : config.colors.light_inactive;
        context.fillRect(this.anim_pos.x, this.anim_pos.y, this.size.x, this.size.y);

        super.draw();
    }
}

class SegmentDisplay extends ModelGate {
    constructor(pos) {
        super(pos, new Vec(5,7));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
        this.inputs.push(new InputNode(this));
    }

    draw() {
        super.draw();

        const X = 1;
        const Y = 2;

        const scale                 = .0026 * Math.min(this.anim_size.x/5, this.anim_size.y/7);
        const skew_x                = -30;
        const width                 = 450;
        const segment_width         = 105;
        const segment_distance      = 12;
        const segment_center_length = 70;

        const center = Vec.add(this.anim_pos, Vec.mult(this.anim_size, .5));

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

        add_path(points_corner, 0  , -1, this.inputs[2].state);
        add_path(points_corner, Y  ,  1, this.inputs[4].state);
        add_path(points_corner, X  ,  1, this.inputs[1].state);
        add_path(points_corner, X|Y, -1, this.inputs[5].state);

        add_path(points_side  , 0  , -1, this.inputs[3].state);
        add_path(points_side  , X  ,  1, this.inputs[0].state);
        add_path(points_center, 0  , -1, this.inputs[6].state);

        function add_path(points, mirror_flags, scalar, state) {
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

                if (i == 0) context.moveTo(transformed_point.x, transformed_point.y);
                else        context.lineTo(transformed_point.x, transformed_point.y);
            }

            context.fillStyle = state ? config.colors.segment_active : config.colors.segment_inactive;
            context.fill();
        }

        function intersection_point(prev, next, point, scalar=1) {
            const prev_vector = Vec.sub(prev, point);
            const next_vector = Vec.sub(next, point);
            const angle = Math.atan2(prev_vector.y, prev_vector.x) - Math.atan2(next_vector.y, next_vector.x);

            const d = segment_distance/2 / Math.sin((Math.PI-angle) * scalar);
            const prev_normalized = Vec.mult(prev_vector, d / Vec.length(prev_vector));
            const next_normalized = Vec.mult(next_vector, d / Vec.length(next_vector));

            const center = Vec.mult(Vec.add(prev_normalized, next_normalized), .5);
            return Vec.add(Vec.mult(Vec.sub(point, center), 2), point);
        }

        function transform_point(vec) {
            return {
                x: center.x + (vec.x + vec.y*skew_x/(width-segment_width/2)) * scale,
                y: center.y + (vec.y                                       ) * scale,
            };
        }
    }
}
