'use strict';

class ConnectionNode extends Element {
    constructor() {
        super();

        this.update_priority_ = 1;

        this.pos = new Vec;
        this.grab_pos_ = null;
        this.anim_pos_ = new Vec;

        this.dir = new Vec(this instanceof OutputNode ? 1 : -1, 0);

        this.anchor_pos_ = new Vec;
        this.anchor_anim_pos_ = new Vec;

        this.tag = null;

        this.index = Infinity;

        this.state = false;
        this.is_inverted = false;

        this.last_pos_ = new Vec;

        this.color_line_ = Color.from(cs.theme.wire_inactive);
        this.color_dot_  = Color.from(cs.theme.wire_inactive);
    }

    update() {
        this.anim_pos_ = View.anim_interpolate_vec(this.anim_pos_, this.grab_pos_||this.pos);

        this.anchor_pos_.set(Vec.add(this.grab_pos_||this.pos, this.dir));
        this.anchor_anim_pos_.set(Vec.add(this.anim_pos_, this.dir));

        const draw_line_active = this.display_state();
        this.apply_current_color(this.color_line_, draw_line_active ? cs.theme.wire_active : cs.theme.wire_inactive, 0);
        this.apply_current_color(this.color_dot_,  draw_line_active ? cs.theme.wire_inactive : cs.theme.wire_active, 1);

        this.color_line_.update();
        this.color_dot_.update();
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    move(total_vec, snap_size_) {
        (this.grab_pos_||this.pos).set(this.last_pos_).add(total_vec);

        this.set_dir(this.grab_pos_||this.pos);
        this.set_index(this.eval_index());
    }

    cancel_animation() {
        super.cancel_animation();

        this.color_dot_.set_anim_hsva(this.color_dot_);
        this.color_line_.set_anim_hsva(this.color_line_);
    }

    run_init_animation() {
        this.cancel_animation();

        this.color_dot_.set_anim_hsva(cs.theme.node_init);
        this.color_line_.set_anim_hsva(cs.theme.node_init);
        this.anim_pos_.add(this.dir);
    }

    mouse_down() {
        this.grab_pos_ = Vec.copy(this.pos);
    }
    mouse_up() {
        this.grab_pos_ = null;
    }

    parent() {
        return ActionGet.all_elements().find(element => element instanceof Gate && element.nodes().includes(this));
    }

    set_dir(pos) {
        this.dir = this.parent().get_dir(pos);
    }

    eval_index() {
        const nodes = this.parent().nodes_per_side()[Util.side_index(this.dir)];

        if (this.is_vertical())
        return Math.floor(Util.map((this.grab_pos_||this.pos).x, this.parent().pos.x, this.parent().pos.x+this.parent().size.x, 0, nodes.length));
        return Math.floor(Util.map((this.grab_pos_||this.pos).y, this.parent().pos.y, this.parent().pos.y+this.parent().size.y, 0, nodes.length));
    }

    set_index(index) {
        const neighbors = this.parent().nodes_per_side()[Util.side_index(this.dir)];

        neighbors.sort(Util.compare_function(x=>x.index));

        neighbors.remove(this);
        neighbors.splice(Math.max(0,index), 0, this);

        neighbors.forEach((neighbor, i) => neighbor.index = i);
    }

    is_vertical() {
        return !this.dir.x;
    }

    previous_node() {
        return ActionGet.all_elements()
            .filter(element => element instanceof Gate)
            .flatMap(gate => [...gate.inputs, ...gate.outputs])
            .find(node => node.next_nodes && node.next_nodes.includes(this));
    }

    invert() {
        this.is_inverted = !this.is_inverted;
        Action.queue_tick(this);
    }

    distance(pos) {
        return WireSegment.distance(
            pos,
            this.is_vertical(),
            this.is_vertical() ? this.pos.x : this.pos.y,
            this.is_vertical()
                ? {min:Math.min(this.pos.y,this.anchor_pos_.y), max:Math.max(this.pos.y,this.anchor_pos_.y)}
                : {min:Math.min(this.pos.x,this.anchor_pos_.x), max:Math.max(this.pos.x,this.anchor_pos_.x)},
        );
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

        if (this.tag) {
            switch (Util.side_index(this.dir)) {
                case Enum.side.east:
                    context.textAlign = 'end';
                    context.textBaseline = 'middle';
                    break;
                case Enum.side.west:
                    context.textAlign = 'start';
                    context.textBaseline = 'middle';
                    break;
                case Enum.side.south:
                    context.textAlign = 'center';
                    context.textBaseline = 'bottom';
                    break;
                case Enum.side.north:
                    context.textAlign = 'center';
                    context.textBaseline = 'top';
                    break;
            }

            context.font = '.5px segoe ui, sans-serif';
            context.fillStyle = cs.theme.wire_inactive.to_string();
            context.fillText(this.tag, ...Vec.sub(this.anim_pos_, Vec.mult(this.dir, .1)).xy);
        }

        if (this.is_inverted) {
            context.beginPath();
            context.arc(...Vec.add(this.anim_pos_, Vec.mult(this.dir, 1/4+.1/2)).xy, 1/4, 0, Math.PI*2);

            context.strokeStyle = this.color_dot_.to_string();
            context.stroke();
        }
    }
}

class InputNode extends ConnectionNode {
    constructor() {
        super();

        this.is_rising_edge = false;
        this.rising_edge_pulse_length = cs.config.default_rising_edge_pulse_length;
        this.rising_edge_ticks_active = 0;
    }

    display_state() {
        return this.state_before;
    }

    eval_state() {
        const previous_node = this.previous_node();

        if (previous_node) {
            this.state_before = previous_node.state;
        }
        else {
            // TEMP
            console.assert(this.is_empty());
            this.state_before = false;
        }

        if (this.is_rising_edge) {
            if (this.state_before != this.is_inverted) {
                return this.rising_edge_ticks_active++ < this.rising_edge_pulse_length;
            }

            this.rising_edge_ticks_active = 0;
            return false;
        }

        return this.state_before != this.is_inverted;
    }

    is_empty() {
        return this.previous_node() == null;
    }

    clear() {
        if (!this.is_empty()) {
            this.previous_node().next_nodes.remove(this);
        }
        Action.queue_tick(this);
    }

    attached_wire_segment() {
        if (this.is_empty()) {
            return null;
        }

        return this.previous_node().wire_segments.find(segment => segment.is_connected_to(this));
    }

    draw() {
        super.draw(false);

        if (this.is_rising_edge) {
            context.beginPath();

            context.moveTo(this.anim_pos_.x + .3*this.dir.y, this.anim_pos_.y + .3*this.dir.x);
            context.lineTo(this.anim_pos_.x - .5*this.dir.x, this.anim_pos_.y - .5*this.dir.y);
            context.lineTo(this.anim_pos_.x - .3*this.dir.y, this.anim_pos_.y - .3*this.dir.x);

            context.strokeStyle = this.color_line_.to_string();
            context.lineWidth = .1;
            context.stroke();
        }
    }
}

class OutputNode extends ConnectionNode {
    constructor() {
        super();

        this.next_nodes = [];

        this.wire_segments = [];
    }

    display_state() {
        return this.state;
    }

    eval_state() {
        const previous_node = this.previous_node();

        if (previous_node) {
            return previous_node.state != this.is_inverted;
        }

        const parent = this.parent();

        if (parent && parent.eval_state) {
            return parent.eval_state() != this.is_inverted;
        }

        return this.is_inverted;
    }

    is_empty() {
        return this.next_nodes.length == 0;
    }

    clear() {
        ActionUtil.queue_tick_for(this.next_nodes);
        this.next_nodes = [];
    }

    attached_wire_segment() {
        return this.wire_segments.find(segment => segment.is_connected_to(this));
    }

    draw() {
        super.draw(true);

        // TEMP
        if (cs.config.DEBUG_DRAW_CONNECTIONS)
            for (const node of this.next_nodes) {
                context.beginPath();

                context.moveTo(...this.anchor_anim_pos_.xy);
                context.lineTo(...node.anchor_anim_pos_.xy);

                context.setLineDash([.1]);
                context.lineWidth = .1/8;

                context.stroke();
                context.setLineDash([]);
            }

        for (const segment of this.wire_segments) {
            segment.draw();
        }
    }
}
