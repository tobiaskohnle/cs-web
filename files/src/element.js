'use strict';

class Element {
    constructor() {
        console.assert(new.target != Element, 'illegal constructor @Element.constructor');
    }

    is_selected() {
        return model.selected_elements.has(this);
    }

    cancel_animation() {
        this.anim_pos.set(this.pos);
    }

    update_pos() {
        this.anim_pos = anim_interpolate_vec(this.anim_pos, this.pos);
    }
    update_size() {
        this.anim_size = anim_interpolate_vec(this.anim_size, this.size);
    }

    draw() {
        throw 'implementation required @Element.draw';
    }

    distance(pos) {
        throw 'implementation required @Element.distance';
    }

    update() {
        throw 'implementation required @Element.update';
    }

    hitbox_rect() {
        throw 'implementation required @Element.hitbox_rect';
    }

    move(vec) {
        throw 'implementation required @Element.move';
    }
}
