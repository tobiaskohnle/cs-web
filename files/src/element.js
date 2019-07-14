'use strict';

class Element {
    constructor() {
        console.assert(new.target != Element, 'illegal constructor @Element.constructor');

        this.snap_size_ = 1;
        this.update_priority_ = 0;

        this.assign_id();
    }

    assign_id() {
        this.id_ = cs.config.next_id++;
    }

    is_selected() {
        return ActionGet.selected_elements().includes(this);
    }
    is_hovered() {
        return this == cs.controller.hovered_element;
    }

    cancel_animation() {
        this.update();
        this.anim_pos_.set(this.pos);
    }

    current_color(default_color=cs.theme.outline) {
        if (this.is_selected()) {
            if (cs.controller.current_action == Enum.action.edit_elements) {
                return cs.theme.edit_outline;
            }

            if (this.is_hovered()) {
                return cs.theme.hovered_selected;
            }

            return cs.theme.selected;
        }
        if (this.is_hovered()) {
            return cs.theme.hovered;
        }

        return default_color;
    }
    apply_current_color(color, default_color) {
        const current_color = this.current_color(default_color);
        color.set_hsva(current_color);

        if (!this.previous_colors_) this.previous_colors_ = new Map;

        const previous_color = this.previous_colors_.get(color);

        if (previous_color != current_color) {
            color.anim_factor(cs.config.default_color_anim_factor);

            if (current_color == cs.theme.hovered || this.is_hovered()) {
                color.anim_factor(cs.config.fast_color_anim_factor);
            }
            else if (previous_color == cs.theme.hovered) {
                color.anim_factor(cs.config.fade_color_anim_factor);
            }
        }

        this.previous_colors_.set(color, current_color);
    }

    update_pos() {
        this.anim_pos_ = View.anim_interpolate_vec(this.anim_pos_, this.pos);
    }
    update_size() {
        this.anim_size_ = View.anim_interpolate_vec(this.anim_size_, this.size);
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
            if (resize_vec.x > 0) {
                this.size.x = Util.round(this.last_size_.x + total_vec.x);
            }
            if (resize_vec.y > 0) {
                this.size.y = Util.round(this.last_size_.y + total_vec.y);
            }

            if (resize_vec.x < 0) {
                this.pos.x = Util.round(this.last_pos_.x + total_vec.x);
                this.size.x = Util.round(this.last_size_.x - total_vec.x);
            }
            if (resize_vec.y < 0) {
                this.pos.y = Util.round(this.last_pos_.y + total_vec.y);
                this.size.y = Util.round(this.last_size_.y - total_vec.y);
            }
        }
    }
}
