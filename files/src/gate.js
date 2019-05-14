'use strict';

class Gate extends Element {
    constructor(pos, size=new Vec(3,4), tag=null) {
        console.assert(new.target != Gate, 'illegal constructor @Gate');

        super(pos);
        this.size = size;

        this.label = null;
        this.tag = tag;

        this.inputs = [];
        this.outputs = [];

        this.update();

        this.cancel_animation();

        for (const input of this.inputs) {
            input.cancel_animation();
        }
        for (const output of this.outputs) {
            output.cancel_animation();
        }
    }

    clear_nodes() {
        for (const input of this.inputs) {
            input.clear();
        }
        for (const output of this.outputs) {
            output.clear();
        }
    }

    update_nodes(nodes, offset) {
        let i = 0;

        for (const node of nodes) {
            const unit = this.size.y / nodes.length / 2;
            const y = this.pos.y + unit*(1 + i++*2);

            node.pos = new Vec(this.pos.x+offset, y);

            // temp
            // node.update();
            Element.prototype.update.call(node);
        }
    }

    update() {
        super.update();

        this.update_nodes(this.inputs, 0);
        this.update_nodes(this.outputs, this.size.x);

        if (!this.anim_size) {
            this.anim_size = new Vec();
            this.anim_size.set(this.size);
            return;
        }
        this.anim_size = anim_interpolate(this.anim_size, this.size);
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

        const is_hovered = this == controller.current_hovered_element;

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

                if (controller.mouse_down) {
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

        this.inner_gates = [];
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
