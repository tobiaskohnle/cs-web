'use strict';

class Element {
    constructor(pos=new Vec) {
        console.assert(new.target != Element, 'illegal constructor @Element');

        this.pos = Vec.copy(pos);
    }

    is_selected() {
        return model.selected_elements.has(this);
    }

    cancel_animation() {
        if (!this.anim_pos) {
            this.anim_pos = new Vec();
        }
        this.anim_pos.set(this.pos);
    }

    update_last_pos() {
        if (!this.last_pos) {
            this.last_pos = new Vec();
        }
        this.last_pos.set(this.pos);
    }

    update() {
        if (!this.anim_pos) {
            this.anim_pos = new Vec();
            this.anim_pos.set(this.pos);
            return;
        }
        this.anim_pos = anim_interpolate(this.anim_pos, this.pos);
    }

    draw() {
        throw 'implementation required @Element@draw';
    }

    distance(pos) {
        throw 'implementation required @Element@distance';
    }

    hitbox_rect() {
        throw 'implementation required @Element@hitbox_rect';
    }

    move(vec) {
        throw 'implementation required @Element@move';
    }
}
