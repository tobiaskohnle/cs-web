'use strict';

class Element {
    constructor() {
        console.assert(new.target != Element, 'illegal constructor @Element.constructor');

        this.snap_size_ = 1;
        this.update_priority_ = 0;

        this.assign_id();
    }

    assign_id() {
        this.id_ = config.next_id++;
    }

    is_selected() {
        return current_tab.model.selected_elements_.has(this);
    }
    is_hovered() {
        return this == current_tab.controller.hovered_element;
    }

    cancel_animation() {
        this.update();
        this.anim_pos_.set(this.pos);
    }

    current_color(default_color=config.colors.outline) {
        if (this.is_selected()) {
            if (current_tab.controller.current_action == Enum.action.edit_elements) {
                return config.colors.edit_outline;
            }

            if (this.is_hovered()) {
                return config.colors.hovered_selected;
            }

            return config.colors.selected;
        }
        if (this.is_hovered()) {
            return config.colors.hovered;
        }

        return this.color || default_color;
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

    move(total_vec, snap_size_) {
        throw 'implementation required @Element.move';
    }

    resize(total_vec, resize_vec) {
        if (this.size) {
            // const pos_vec = new Vec(
            //     resize_vec.x < 0 ? Math.min(total_vec.x, 0) : 0,
            //     resize_vec.y < 0 ? Math.min(total_vec.y, 0) : 0,
            // );

            // this.pos = Vec.add(this.last_pos_, pos_vec).round();
            // this.size = Vec.add(this.last_size_, Vec.mult_vec(total_vec, resize_vec)).round();

            if (resize_vec.x > 0) {
                this.size.x = round(this.last_size_.x + total_vec.x);
            }
            if (resize_vec.y > 0) {
                this.size.y = round(this.last_size_.y + total_vec.y);
            }

            if (resize_vec.x < 0) {
                this.pos.x = round(this.last_pos_.x + total_vec.x);
                this.size.x = round(this.last_size_.x - total_vec.x);
            }
            if (resize_vec.y < 0) {
                this.pos.y = round(this.last_pos_.y + total_vec.y);
                this.size.y = round(this.last_size_.y - total_vec.y);
            }
        }
    }
}
