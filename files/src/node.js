'use strict';

class ConnectionNode extends Element {
    constructor(parent, index) {
        super();

        this.pos = new Vec;
        this.anim_pos_ = new Vec;

        this.dir = new Vec(this instanceof OutputNode ? 1 : -1, 0);
        this.parent = parent;

        this.anchor_pos_ = new Vec;
        this.anchor_anim_pos_ = new Vec;

        this.label = null;
        this.tag = null;

        this.index = index;

        this.state = false;
        this.is_inverted = false;

        this.color_line_ = Color.new(config.colors.wire_inactive);
        this.color_dot_  = Color.new(config.colors.wire_inactive);
    }

    update() {
        this.anim_pos_ = anim_interpolate_vec(this.anim_pos_, this.pos);

        this.anchor_pos_.set(Vec.add(this.pos, this.dir));
        this.anchor_anim_pos_.set(Vec.add(this.anim_pos_, this.dir));

        const draw_line_active = this.is_inverted ? this.state == (this instanceof OutputNode) : this.state;
        const color_line = this.color(draw_line_active ? config.colors.wire_active : config.colors.wire_inactive);
        const color_dot  = this.color(draw_line_active ? config.colors.wire_inactive : config.colors.wire_active);

        this.color_line_.set_hsva(color_line);
        this.color_dot_.set_hsva(color_dot);

        this.color_line_.update();
        this.color_dot_.update();
    }

    move(vec, total_vec) {
        console.log('move node');
    }

    is_vertical() {
        return !this.dir.x;
    }

    previous_node() {
        return all_inner_elements(current_tab.model.main_gate)
            .filter(element => element instanceof Gate)
            .flatMap(gate => [...gate.inputs, ...gate.outputs])
            .find(node => node.next_nodes && node.next_nodes.includes(this));
    }

    invert() {
        this.is_inverted = !this.is_inverted;
        current_tab.model.queue_tick(this);
    }

    distance(pos) {
        const dist = Vec.sub(this.pos, pos).length();

        if (dist > 2) {
            return Infinity;
        }

        return dist;
    }

    hitbox_rect() {
        return {
            pos: this.pos,
            size: this.dir,
        };
    }

    draw() {
        const off = this.is_inverted ? 1/2+.1/2 : 0;

        context.beginPath();
        context.moveTo(...Vec.add(this.anim_pos_, Vec.mult(this.dir, off)).xy);
        context.lineTo(...Vec.add(this.anim_pos_, this.dir).xy);

        context.strokeStyle = this.color_line_.to_string();

        context.lineWidth = .1;
        context.stroke();

        if (this.is_inverted) {
            context.beginPath();
            // context.arc(this.anim_pos_.x+this.dir.x/4+this.dir.x*.1/2, this.anim_pos_.y, 1/4, 0, Math.PI*2);
            context.arc(...Vec.add(this.anim_pos_, Vec.mult(this.dir, 1/4+.1/2)).xy, 1/4, 0, Math.PI*2);

            // context.strokeStyle = !draw_line_active ? config.colors.wire_active : config.colors.wire_inactive;
            context.strokeStyle = this.color_dot_.to_string();
            context.stroke();
        }
    }
}

class InputNode extends ConnectionNode {
    constructor(parent, index) {
        super(parent, index);

        this.is_rising_edge = false;
        this.rising_edge_pulse_length = config.default_rising_edge_pulse_length;
        this.rising_edge_ticks_active = 0;
    }

    eval_state() {
        const previous_node = this.previous_node();

        let state;

        if (previous_node) {
            state = previous_node.state != this.is_inverted;
        }
        else {
            console.assert(this.is_empty());
            state = this.is_inverted;
        }

        if (this.is_rising_edge) {
            if (state) {
                return this.rising_edge_ticks_active++ < this.rising_edge_pulse_length;
            }

            this.rising_edge_ticks_active = 0;
            return false;
        }
        else {
            return state;
        }
    }

    is_empty() {
        return this.previous_node() == null;
    }

    clear() {
        if (!this.is_empty()) {
            this.previous_node().next_nodes.remove(this);
        }
        current_tab.model.queue_tick(this);
    }

    draw() {
        super.draw(false);

        if (this.is_rising_edge) {
            context.beginPath();

            context.moveTo(this.anim_pos_.x, this.anim_pos_.y-.3);
            context.lineTo(this.anim_pos_.x+.5, this.anim_pos_.y);
            context.lineTo(this.anim_pos_.x, this.anim_pos_.y+.3);

            context.strokeStyle = this.color();
            context.lineWidth = .1;
            context.stroke();
        }
    }
}

class OutputNode extends ConnectionNode {
    constructor(parent, index) {
        super(parent, index);

        this.next_nodes = [];

        this.wire_segments = [];
    }

    update() {
        super.update();

        for (const segment of this.wire_segments) {
            segment.update();
        }
    }

    eval_state() {
        if (this.previous_node()) {
            return this.previous_node().state != this.is_inverted;
        }

        return this.parent.eval_state() != this.is_inverted;
    }

    is_empty() {
        return this.next_nodes.length == 0;
    }

    clear() {
        for (const next_node of this.next_nodes) {
            current_tab.model.queue_tick(next_node);
        }
        this.next_nodes = [];
    }

    draw() {
        super.draw(true);

        for (const segment of this.wire_segments) {
            segment.draw();
        }
    }
}
