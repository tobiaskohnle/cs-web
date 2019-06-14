'use strict';

class Label extends Element {
    constructor(pos=new Vec, size=new Vec(5,2)) {
        super();

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.anim_color_ = Color.from(config.colors.label_outline);
        this.anim_text_color_ = Color.from(config.colors.label_text);

        this.font_size = 1;
        this.anim_font_size_ = 1;

        this.text = '';

        this.vertical_text_align = Enum.align.center;
        this.horizontal_text_align = Enum.align.center;

        this.selection_start = 0;
        this.caret = 0;

        this.last_time_caret_moved_ = Date.now();
        this.caret_hovered_ = 0;

        this.anim_selection_bounds_;
        this.anim_caret_bounds_;

        this.anim_total_width_ = 0;
        this.anim_chars_offset_ = [];

        this.mousedown_caret_;
        this.mousedown_detail_;
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    update() {
        super.update_pos();
        super.update_size();

        const color = Color.from(this.color(config.colors.label_outline));

        if (this.is_selected() && C.current_action == Enum.action.edit_elements) {
            color.set_hsva(config.colors.edit_outline);
        }

        color.from_hsva({a: config.colors.label_outline.a});

        this.anim_color_.set_hsva(color);
        this.anim_color_.update();

        this.anim_text_color_.set_hsva(this.special_info() ? config.colors.label_special_text : config.colors.label_text);
        this.anim_text_color_.update();

        this.anim_font_size_ = anim_interpolate(this.anim_font_size_, this.font_size, config.label_anim_factor);

        let total_width = this.text_width(this.text);
        this.anim_total_width_ = anim_interpolate(this.anim_total_width_, total_width, config.label_anim_factor);

        const offset = new Vec(
            (this.size.x - total_width)    * [0, .5, 1][this.horizontal_text_align],
            (this.size.y - this.font_size) * [0, .5, 1][this.vertical_text_align] + this.font_size/2,
        );
        this.anim_offset_ = anim_interpolate_vec(this.anim_offset_, offset, config.label_anim_factor);

        const selection_bounds = this.text_bounds(this.selection_start, this.selection_width());

        if (!this.anim_selection_bounds_) this.anim_selection_bounds_ = selection_bounds;
        this.anim_selection_bounds_.start = anim_interpolate(this.anim_selection_bounds_.start, selection_bounds.start, config.label_anim_factor);
        this.anim_selection_bounds_.end = anim_interpolate(this.anim_selection_bounds_.end, selection_bounds.end, config.label_anim_factor);

        const caret_bounds = this.text_bounds(this.caret, 0);
        caret_bounds.start -= config.label_caret_width/2 * this.font_size;
        caret_bounds.end = config.label_caret_width * this.font_size + caret_bounds.start;

        if (!this.anim_caret_bounds_) this.anim_caret_bounds_ = caret_bounds;
        this.anim_caret_bounds_.start = anim_interpolate(this.anim_caret_bounds_.start, caret_bounds.start, config.label_anim_factor);
        this.anim_caret_bounds_.end = anim_interpolate(this.anim_caret_bounds_.end, caret_bounds.end, config.label_anim_factor);

        let width = 0;
        for (let x = 0; x < this.text.length; x++) {
            this.anim_chars_offset_[x] = anim_interpolate(this.anim_chars_offset_[x], width, config.label_anim_factor);
            width += this.get_char_width(this.text[x]);
        }

        const delta_time = Date.now() - this.last_time_caret_moved_;
        const sin = config.label_caret_smoothness * Math.sin(
            Math.PI * (1/4 + 2*delta_time/config.label_caret_blink_rate + config.label_caret_blink_rate/2)
        );
        const alpha = delta_time < config.label_caret_blink_rate/2 ? 1 : map(clamp(sin, -1, 1), -1, 1, 0, 1);
        this.caret_color_ = Color.from(config.colors.label_caret, {a:alpha}).to_string();
    }

    move(vec, total_vec, snap_size_) {
        super.snap_pos(this.last_pos_, total_vec, snap_size_);
    }

    next_vertical_align() {
        this.vertical_text_align = [Enum.align.center, Enum.align.end, Enum.align.start][this.vertical_text_align];
    }
    next_horizontal_align() {
        this.horizontal_text_align = [Enum.align.center, Enum.align.end, Enum.align.start][this.horizontal_text_align];
    }

    increase_font_size() {
        this.font_size *= 1.2;
    }
    decrease_font_size() {
        this.font_size /= 1.2;
    }

    special_info() {
        if (/^tag\s*=/i.test(this.text)) {
            return {tag: this.text.match(/^tag\s*=(?<tag>[\w\s]*)/i).groups.tag.trim()};
        }

        if (/^name\s*=/i.test(this.text)) {
            return {name: this.text.match(/^name\s*=(?<name>[\w\s]*)/i).groups.name.trim()};
        }

        if (/^size\s*=/i.test(this.text)) {
            if (/^size\s*=\s*\d+\s*,\s*\d+\s*/i.test(this.text)) {
                const size = this.text.match(/^size\s*=\s*(?<x>\d+)\s*,\s*(?<y>\d+)\s*/i).groups;
                return {size: new Vec(parseInt(size.x), parseInt(size.y))};
            }
            if (/^size\s*=\s*\d+\s*/i.test(this.text)) {
                const size = this.text.match(/^size\s*=\s*(?<xy>\d+)\s*/i).groups;
                return {size: new Vec(parseInt(size.xy))};
            }

            return {size: new Vec(3,4)};
        }

        return null;
    }

    distance(pos) {
        if (between(pos.x, this.pos.x, this.pos.x+this.size.x) &&
            between(pos.y, this.pos.y, this.pos.y+this.size.y)
        ) {
            return 0;
        }

        return Infinity;
    }

    hitbox_rect() {
        return {
            pos: this.pos,
            size: this.size,
        };
    }

    text_bounds(start, width) {
        return {
            start: this.text_width(this.text.substring(0, start)),
            end: this.text_width(this.text.substring(0, start+width)),
        };
    }

    get_char_width(char='') {
        context.font = `${this.font_size}px sans-serif`;
        return context.measureText(char).width;
    }
    text_width(text) {
        let width = 0;

        for (const char of text) {
            width += this.get_char_width(char);
        }

        return width;
    }

    draw_text_bounds(bounds) {
        context.fillRect(bounds.start, this.anim_font_size_/-2, bounds.end-bounds.start, this.anim_font_size_);
    }

    draw() {
        context.lineWidth = .1;
        context.strokeStyle = this.anim_color_.to_string();
        context.strokeRect(...this.anim_pos_.xy, ...this.anim_size_.xy);

        context.save();

        context.translate(...Vec.add(this.anim_pos_, this.anim_offset_).xy);

        context.fillStyle = this.anim_text_color_.to_string();
        context.font = `${this.anim_font_size_}px sans-serif`;
        context.textAlign = 'start';
        context.textBaseline = 'middle';

        for (let x = 0; x < this.text.length; x++) {
            const char = this.text[x];
            context.fillText(char, this.anim_chars_offset_[x], 0);
        }

        context.fillStyle = config.colors.label_selection.to_string();
        this.draw_text_bounds(this.anim_selection_bounds_);

        if (document.hasFocus() && this.is_selected() && C.current_action == Enum.action.edit_elements) {
            context.fillStyle = this.caret_color_;
            this.draw_text_bounds(this.anim_caret_bounds_);
        }

        context.restore();
    }

    selection_width() {
        return this.caret - this.selection_start;
    }
    selection_lower() {
        return Math.min(this.caret, this.selection_start);
    }
    selection_upper() {
        return Math.max(this.caret, this.selection_start);
    }
    next_word_stop(index, dir) {
        while (index >= 0 && index <= this.text.length) {
            index += dir;

            if (dir > 0 != (' ' == this.text[index-1]) &&
                dir > 0 == (' ' == this.text[index])
            ) break;
        }

        return Math.max(0, Math.min(this.text.length, index));
    }

    set_caret(pos, extend_selection) {
        this.last_time_caret_moved_ = Date.now();
        this.caret = Math.max(0, Math.min(this.text.length, pos));

        if (!extend_selection) {
            this.selection_start = this.caret;
        }
    }

    select_all() {
        this.set_caret(0);
        this.set_caret(this.text.length, true);
    }

    get_text_index(page_x) {
        const rel_x = page_x - this.size.x/2 + this.text_width(this.text)/2;

        let smallest_dist = Infinity;

        let width = 0;

        for (let x = 0; x <= text.length; x++) {
            const current_dist = Math.abs(rel_x - width);
            width += this.get_char_width(text[x]);

            if (current_dist > smallest_dist) {
                return x - 1;
            }

            smallest_dist = current_dist;
        }

        return this.text.length;
    }

    get_word_bounds(index) {
        return {
            lower: this.next_word_stop(index, -1),
            upper: this.next_word_stop(index, 1),
        };
    }

    mouse_down(event) {
        this.mousedown_caret_ = this.caret;
        this.mousedown_detail_ = event.detail;

        switch ((event.detail-1) % 3) {
            case 0:
                set_caret(this.caret_hovered_, event.shiftKey);
                break;
            case 1:
                const bounds = this.get_word_bounds(this.caret_hovered_);
                this.set_caret(bounds.lower, event.shiftKey);
                this.set_caret(bounds.upper, true);
                break;
            case 2:
                this.select_all();
                break;
        }
    }
    mouse_move(event) {
        this.caret_hovered_ = this.get_text_index(event.x);

        switch ((this.mousedown_detail_-1) % 3) {
            case 0:
                this.set_caret(this.caret_hovered_, true);
                break;
            case 1:
                const init_bounds = this.get_word_bounds(this.mousedown_caret_);
                const bounds = this.get_word_bounds(this.caret_hovered_);

                this.selection_start = Math.min(init_bounds.lower, bounds.lower);
                this.set_caret(Math.max(init_bounds.upper, bounds.upper), true);
                break;
        }
    }

    delete_selection() {
        this.anim_chars_offset_.splice(this.selection_lower(), this.selection_upper()-this.selection_lower());

        this.text = `${this.text.substr(0, this.selection_lower())}${this.text.substring(this.selection_upper(), this.text.length)}`;
        this.set_caret(this.selection_lower());
    }
    write_text(string) {
        let width = this.text_width(this.text.substr(0, this.selection_lower()));
        this.anim_chars_offset_.splice(this.caret, 0, ...Array.from(Array(string.length), (_,i) => {
            let prev_width = width;
            width += this.get_char_width(string[i]);
            return prev_width;
        }));

        this.delete_selection();
        this.text = `${this.text.substr(0, this.caret)}${string}${this.text.substring(this.caret, this.text.length)}`;
        this.set_caret(this.caret + string.length);
    }

    delete_direction(dir, ctrlKey) {
        if (this.selection_width() == 0) {
            this.set_caret(ctrlKey ? this.next_word_stop(this.caret,dir) : this.caret+dir, true);
        }
        this.delete_selection();
    }
    move_direction(dir, shiftKey, ctrlKey) {
        if (!shiftKey && this.selection_width()) {
            this.set_caret(dir < 0 ? this.selection_lower() : this.selection_upper());
        }
        else {
            this.set_caret(ctrlKey ? this.next_word_stop(this.caret,dir) : this.caret+dir, shiftKey);
        }
    }

    key_down(event) {
        switch (event.key) {
            default:
                if (event.key.length != 1) {
                    break;
                }

                if (event.ctrlKey) {
                    switch (event.key) {
                        case 'a':
                            this.select_all();
                            return false;
                        case 'c':
                            this.clipboard = this.text.substring(this.selection_lower(), this.selection_upper()) || this.text;
                            if (config.use_system_clipboard) {
                                navigator.clipboard.writeText(this.clipboard);
                            }

                            return false;
                        case 'x':
                            if (this.selection_width() == 0) {
                                this.select_all();
                            }

                            this.clipboard = this.text.substring(this.selection_lower(), this.selection_upper());
                            if (config.use_system_clipboard) {
                                navigator.clipboard.writeText(this.clipboard);
                            }

                            this.delete_selection();
                            return false;
                        case 'v':
                            if (config.use_system_clipboard) {
                                navigator.clipboard.readText().then(string => {
                                    this.write_text(string);
                                });
                            }
                            else {
                                this.write_text(this.clipboard);
                            }
                            return false;
                    }
                    break;
                }

                this.write_text(event.key);
                return false;

            case 'ArrowLeft':
                this.move_direction(-1, event.shiftKey, event.ctrlKey);
                return false;
            case 'ArrowRight':
                this.move_direction(1, event.shiftKey, event.ctrlKey);
                return false;

            case 'Home':
                this.set_caret(0, event.shiftKey);
                return false;
            case 'End':
                this.set_caret(this.text.length, event.shiftKey);
                return false;

            case 'Backspace':
                this.delete_direction(-1, event.ctrlKey);
                return false;
            case 'Delete':
                this.delete_direction(1, event.ctrlKey);
                return false;
        }

        return true;
    }
}
