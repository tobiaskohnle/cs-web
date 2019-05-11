'use strict';

class ConnectionNode extends Element {
    constructor(dir, parent) {
        super();

        // console.assert(parent);

        this.dir = dir;

        this.parent = parent;

        this.is_inverted = false;

        this.is_invisible_inverted = false;

        this.label = null;
        this.tag = null;

        this.state = false;
    }

    update() {}

    move(vec) {}

    previous_node() {
        return get_all_inner_gates(model.main_gate)//.inner_gates
            // .filter(element => element instanceof Gate)
            .flatMap(gate => [...gate.inputs, ...gate.outputs])
            .find(node => node.next_nodes && node.next_nodes.includes(this));
    }

    invert() {
        this.is_inverted = !this.is_inverted;
        model.queue_tick(this);
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
            size: new Vec(this.dir, 0),
        };
    }

    draw(is_output) {
        const off = this.is_inverted ? 1/2+.1/2 : 0;

        context.beginPath();
        context.moveTo(this.anim_pos.x+this.dir*off, this.anim_pos.y);
        context.lineTo(this.anim_pos.x+this.dir, this.anim_pos.y);

        const draw_line_active = this.is_inverted ? this.state ^ is_output ^ 1 : this.state;

        context.strokeStyle = draw_line_active ? config.colors.wire_active : config.colors.wire_inactive;

        const is_hovered = this == controller.current_hovered_element;

        if (is_hovered) {
            context.strokeStyle = config.colors.hovered;
        }
        if (this.is_selected()) {
            // context.strokeStyle = '#24ce';
            context.strokeStyle = config.colors.selected;

            if (is_hovered) {
                // context.strokeStyle = '#26ee';
                context.strokeStyle = config.colors.hovered_selected;

                // if (controller.mouse_down) {
                //     context.strokeStyle = config.colors.hovered_selected_pressed;
                // }
            }
        }

        context.lineWidth = .1;
        context.stroke();

        if (this.is_inverted) {
            context.beginPath();
            context.arc(this.anim_pos.x+this.dir/4+this.dir*.1/2, this.anim_pos.y, 1/4, 0, Math.PI*2);

            context.strokeStyle = !draw_line_active ? config.colors.wire_active : config.colors.wire_inactive;

            // context.closePath();

            // context.strokeStyle = this.state ? '#f33e' : '#000e';
            context.stroke();
        }
    }
}

class InputNode extends ConnectionNode {
    constructor(parent) {
        super(-1, parent);
    }

    eval_state() {
        if (this.previous_node()) {
            return this.previous_node().state != this.is_inverted;
        }

        console.assert(this.is_empty());

        return this.is_inverted;
    }

    is_empty() {
        return this.previous_node() == null;
    }

    clear() {
        if (!this.is_empty()) {
            this.previous_node().next_nodes.remove(this);
        }
        model.queue_tick(this);
    }

    // parent() {
    //     return model.main_gate.inner_gates.find(gate => gate instanceof Gate && gate.inputs.includes(this));
    // }

    draw() {
        super.draw(false);
    }
}

class OutputNode extends ConnectionNode {
    constructor(parent) {
        super(1, parent);

        this.next_nodes = [];
    }

    eval_state() {
        // if (!parent) {
        //     // if the parent is deleted while the node is queued for a tick
        //     return false;
        // }

        if (this.previous_node()) {
            return this.previous_node().state != this.is_inverted;
        }

        return this.parent.eval_state() != this.is_inverted;
    }

    // eval_state() {
    //     const parent = this.parent();

    //     if (!parent) {
    //         // if the parent is deleted while the node is queued for a tick
    //         return false;
    //     }

    //     try {

    //         return parent.eval_state() != this.is_inverted;

    //     }
    //     catch {debugger}
    // }

    is_empty() {
        return this.next_nodes.length == 0;
    }

    clear() {
        for (const next_node of this.next_nodes) {
            model.queue_tick(next_node);
        }
        this.next_nodes = [];
    }

    // parent() {
    //     return model.main_gate.inner_gates.find(gate => gate instanceof Gate && gate.outputs.includes(this));
    // }

    draw() {
        super.draw(true);

        for (const next_node of this.next_nodes) {
            draw_wire(Vec.add(this.anim_pos, new Vec(1,0)), Vec.sub(next_node.anim_pos, new Vec(1,0)), this.state);
        }
    }
}
