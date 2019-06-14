'use strict';

class Element {
    constructor() {
        console.assert(new.target != Element, 'illegal constructor @Element.constructor');

        this.snap_size_ = 1;
        this.update_priority_ = 0;

        this.id_ = config.next_id++;
    }

    is_selected() {
        return current_tab.model.selected_elements_.has(this);
    }
    is_hovered() {
        return this == current_tab.controller.current_hovered_element;
    }

    cancel_animation() {
        this.update();
        this.anim_pos_.set(this.pos);
    }

    color(default_color=config.colors.outline) {
        if (this.is_selected()) {
            if (this.is_hovered()) {
                return config.colors.hovered_selected;
            }

            return config.colors.selected;
        }
        if (this.is_hovered()) {
            return config.colors.hovered;
        }

        return default_color;
    }

    update_pos() {
        this.anim_pos_ = anim_interpolate_vec(this.anim_pos_, this.pos);
    }
    update_size() {
        this.anim_size_ = anim_interpolate_vec(this.anim_size_, this.size);
    }

    snap_pos(last_pos, total_vec, snap_size_) {
        this.pos.set(Vec.add(Vec.round(last_pos, this.snap_size_), Vec.round(total_vec, snap_size_)));
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

    move(vec, total_vec, snap_size_) {
        throw 'implementation required @Element.move';
    }
}
