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

    current_color(default_color=cs.theme.outline) {
        if (this.is_selected()) {
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
    apply_current_color(color, default_color, label=0) {
        const current_color = this.current_color(default_color);

        this.previous_colors_ = this.previous_colors_ || {};
        const previous_color = this.previous_colors_[label];

        if (previous_color != current_color) {
            color.hsva(current_color).anim_factor(cs.config.default_color_anim_factor);

            if (current_color == cs.theme.hovered || this.is_hovered()) {
                color.anim_factor(cs.config.fast_color_anim_factor);
            }
            else if (previous_color == cs.theme.hovered) {
                color.anim_factor(cs.config.fade_color_anim_factor);
            }
        }

        this.previous_colors_[label] = current_color;
    }

    update_pos(skip_animations=false) {
        this.anim_pos_ = View.anim_interpolate_vec(this.anim_pos_, this.pos, skip_animations);
    }
    update_size(skip_animations=false) {
        this.anim_size_ = View.anim_interpolate_vec(this.anim_size_, this.size, skip_animations);
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

    update(skip_animations=false) {
        throw 'implementation required @Element.update';
    }

    hitbox_rect() {
        throw 'implementation required @Element.hitbox_rect';
    }

    move(total_vec, snap_size_) {
        throw 'implementation required @Element.move';
    }

    static resize(element, total_vec, resize_vec) {
        const previous_pos = Vec.copy(element.pos);
        const previous_size = Vec.copy(element.size);

        if (element.size) {
            if (resize_vec.x > 0) {
                const new_size_x = element.last_size_.x + Util.round(total_vec.x);

                if (new_size_x > 0) {
                    element.size.x = new_size_x;
                }
            }
            if (resize_vec.y > 0) {
                const new_size_y = element.last_size_.y + Util.round(total_vec.y);

                if (new_size_y > 0) {
                    element.size.y = new_size_y;
                }
            }

            if (resize_vec.x < 0) {
                const new_size_x = element.last_size_.x - Util.round(total_vec.x);

                if (new_size_x > 0) {
                    element.pos.x = element.last_pos_.x + Util.round(total_vec.x);
                    element.size.x = new_size_x;
                }
            }
            if (resize_vec.y < 0) {
                const new_size_y = element.last_size_.y - Util.round(total_vec.y);

                if (new_size_y > 0) {
                    element.pos.y = element.last_pos_.y + Util.round(total_vec.y);
                    element.size.y = new_size_y;
                }
            }
        }

        return !previous_pos.equals(element.pos) || !previous_size.equals(element.size);
    }
}
