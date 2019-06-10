'use strict';

class Label extends Element {
    constructor(pos=new Vec, size=new Vec(5,2)) {
        super();

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.anim_color_ = new Color;
        this.anim_color_.set_hsva(config.colors.outline);

        this.font_size = 1;

        // this.caret_index = 0;
        // this.selection_index = 0;

        // this.anim_caret_index_ = 0;
        // this.anim_selection_index_ = 0;

        this.text = '';

        this.last_time_caret_moved = Date.now();

        this.caret_hovered = 0;
        this.selection_start = 0;
        this.caret = 0;

        this.anim_selection_bounds;
        this.anim_caret_bounds;

        this.text = '';
        this.anim_total_offset = 0;
        this.anim_chars_offset = [];

        this.mousedown_caret;
        this.mousedown_detail;
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }

    update() {
        super.update_pos();
        super.update_size();

        const color = new Color;
        color.set_hsva(this.color(new Color(220/360, .2, .4)));
        color.a = .7;

        if (this.is_selected() && C.current_action == Enum.action.edit_labels) {
            color.set_hsva({h:-.02, s:.8, v:.9, a:.9});
        }

        this.anim_color_.set_hsva(color);
        this.anim_color_.update();
    }

    special_info() {
        if (/^tag\s*=/i.test(this.text)) {
            return {tag: this.text.match(/^tag\s*=\s*(?<tag>\w*)\s*/i).groups.tag};
        }

        if (/^name\s*=/i.test(this.text)) {
            return {name: this.text.match(/^name\s*=\s*(?<name>\w*)\s*/i).groups.name};
        }

        if (/^size\s*=/i.test(this.text)) {
            if (/^size\s*=\d+,\d+/i.test(this.text)) {
                const size = this.text.match(/^size\s*=\s*(?<x>\d+)\s*,\s*(?<y>\d+)\s*/i).groups;
                return {size: new Vec(parseInt(size.x), parseInt(size.y))};
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

    move(vec, total_vec, snap_size) {
        this.pos.set(this.last_pos_).add(total_vec).round(snap_size);
    }

    text_bounds(start, width) {
        return {
            start: this.text_width(this.text.substring(0, start)),
            end: this.text_width(this.text.substring(0, start+width)),
        };
    }

    get_char_width(char='') {
        if (/[fijl.,:; ]/.test(char)) return .3 * this.font_size;
        if (/[rt]/       .test(char)) return .4 * this.font_size;
        if (/[mw]/       .test(char)) return .8 * this.font_size;
        return .6;
        // return context.measureText(char).width / current_tab.camera.anim_scale_;
    }
    text_width(text) {
        let width = 0;

        for (const char of text) {
            width += this.get_char_width(char);
        }

        return width;
    }

    draw_text_bounds(bounds) {
        context.fillRect(bounds.start, this.font_size/-2, bounds.end-bounds.start, this.font_size);
    }

    draw() {
        context.lineWidth = .1;
        context.strokeStyle = this.anim_color_.to_string();
        context.strokeRect(...this.anim_pos_.xy, ...this.anim_size_.xy);

        context.save();

        let total_width = this.text_width(this.text);
        this.anim_total_offset = anim_interpolate(this.anim_total_offset, total_width, config.label_anim_factor);

        const center = Vec.add(this.anim_pos_, Vec.div(this.anim_size_, 2));
        context.translate(center.x - this.anim_total_offset/2, center.y);

        const selection_bounds = this.text_bounds(this.selection_start, this.selection_width());

        if (!this.anim_selection_bounds) this.anim_selection_bounds = selection_bounds;
        this.anim_selection_bounds.start = anim_interpolate(this.anim_selection_bounds.start, selection_bounds.start, config.label_anim_factor);
        this.anim_selection_bounds.end = anim_interpolate(this.anim_selection_bounds.end, selection_bounds.end, config.label_anim_factor);

        context.fillStyle = '#ccc';

        let width = 0;

        for (let x = 0; x < this.text.length; x++) {
            this.anim_chars_offset[x] = anim_interpolate(this.anim_chars_offset[x], width, config.label_anim_factor);

            const char = this.text[x];
            context.font = `${this.font_size}px sans-serif`;
            context.textAlign = 'start';
            context.textBaseline = 'middle';
            context.fillText(char, this.anim_chars_offset[x], 0);

            width += this.get_char_width(char);
        }

        context.fillStyle = '#09f4';
        this.draw_text_bounds(this.anim_selection_bounds);

        const caret_bounds = this.text_bounds(this.caret, 0);
        caret_bounds.start -= config.label_caret_width/2;
        caret_bounds.end = config.label_caret_width + caret_bounds.start;

        if (!this.anim_caret_bounds) this.anim_caret_bounds = caret_bounds;
        this.anim_caret_bounds.start = anim_interpolate(this.anim_caret_bounds.start, caret_bounds.start, config.label_anim_factor);
        this.anim_caret_bounds.end = anim_interpolate(this.anim_caret_bounds.end, caret_bounds.end, config.label_anim_factor);

        if (document.hasFocus() && C.current_action == Enum.action.edit_labels) {
            context.fillStyle = `rgba(${0x00},${0x77},${0xff},${
                map(
                    Date.now()-this.last_time_caret_moved < config.label_caret_blink_rate/2 ? 1 :
                    Math.max(
                        -1,
                        Math.min(
                            1,
                            config.label_caret_smoothness * Math.sin(
                                (Date.now()-this.last_time_caret_moved)*Math.PI*2/config.label_caret_blink_rate
                                + Math.PI/4+config.label_caret_blink_rate/2
                            ),
                        ),
                    ),
                    -1, 1,
                    0, 1,
                )
            })`;
            this.draw_text_bounds(this.anim_caret_bounds);
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
        this.last_time_caret_moved = Date.now();
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
        this.mousedown_caret = this.caret;
        this.mousedown_detail = event.detail;

        if (event.buttons == 1) {
            switch ((event.detail-1) % 3) {
                case 0:
                    set_caret(this.caret_hovered, event.shiftKey);
                    break;
                case 1:
                    const bounds = this.get_word_bounds(this.caret_hovered);
                    this.set_caret(bounds.lower, event.shiftKey);
                    this.set_caret(bounds.upper, true);
                    break;
                case 2:
                    this.select_all();
                    break;
            }
        }
    }
    mouse_move(event) {
        this.caret_hovered = this.get_text_index(event.x);

        if (event.buttons == 1) {
            switch ((this.mousedown_detail-1) % 3) {
                case 0:
                    this.set_caret(this.caret_hovered, true);
                    break;
                case 1:
                    const init_bounds = this.get_word_bounds(this.mousedown_caret);
                    const bounds = this.get_word_bounds(this.caret_hovered);

                    this.selection_start = Math.min(init_bounds.lower, bounds.lower);
                    this.set_caret(Math.max(init_bounds.upper, bounds.upper), true);
                    break;
            }
        }
    }

    delete_selection() {
        this.anim_chars_offset.splice(this.selection_lower(), this.selection_upper()-this.selection_lower());

        this.text = `${this.text.substr(0, this.selection_lower())}${this.text.substring(this.selection_upper(), this.text.length)}`;
        this.set_caret(this.selection_lower());
    }
    write_text(string) {
        let width = this.text_width(this.text.substr(0, this.caret));
        this.anim_chars_offset.splice(this.caret, 0, ...Array.from(Array(string.length), (_,i) => {
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
