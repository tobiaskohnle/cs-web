'use strict';

class Label extends Element {
    constructor(pos=new Vec, size=new Vec(5,2)) {
        super();

        this.pos = pos;
        this.size = size;
        this.anim_pos_ = Vec.copy(pos);
        this.anim_size_ = Vec.copy(size);

        this.last_pos_ = new Vec;

        this.anim_color_ = Color.from(cs.theme.label_outline);
        this.text_color_ = Color.from(cs.theme.label_text);

        this.text = '';

        this.font_size = 1;

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

    resize(total_vec, resize_vec) {
        Element.resize(this, total_vec, resize_vec);
    }

    update_last_pos() {
        this.last_pos_ = Vec.copy(this.pos);
    }
    update_last_size() {
        this.last_size_ = Vec.copy(this.size);
    }

    update() {
        super.update_pos();
        super.update_size();

        this.apply_current_color(this.anim_color_, cs.theme.label_outline);
        this.anim_color_.update();

        this.text_color_ =
            this.special_info() ? cs.theme.label_special_text :
            this.description_info() ? cs.theme.label_description_text :
            cs.theme.label_text;

        this.total_width_ = this.text_width(this.text);
        this.anim_total_width_ = View.anim_interpolate(this.anim_total_width_, this.total_width_, cs.config.label_anim_factor);

        this.selection_bounds_ = this.text_bounds(this.selection_start, this.selection_width());

        if (!this.anim_selection_bounds_) this.anim_selection_bounds_ = this.selection_bounds_;
        this.anim_selection_bounds_.start = View.anim_interpolate(this.anim_selection_bounds_.start, this.selection_bounds_.start, cs.config.label_anim_factor);
        this.anim_selection_bounds_.end = View.anim_interpolate(this.anim_selection_bounds_.end, this.selection_bounds_.end, cs.config.label_anim_factor);

        this.caret_bounds_ = this.text_bounds(this.caret, 0);
        this.caret_bounds_.start -= cs.config.label_caret_width/2 * this.font_size;
        this.caret_bounds_.end = cs.config.label_caret_width * this.font_size + this.caret_bounds_.start;

        if (!this.anim_caret_bounds_) this.anim_caret_bounds_ = this.caret_bounds_;
        this.anim_caret_bounds_.start = View.anim_interpolate(this.anim_caret_bounds_.start, this.caret_bounds_.start, cs.config.label_anim_factor);
        this.anim_caret_bounds_.end = View.anim_interpolate(this.anim_caret_bounds_.end, this.caret_bounds_.end, cs.config.label_anim_factor);

        let width = 0;
        for (let x = 0; x < this.text.length; x++) {
            this.anim_chars_offset_[x] = View.anim_interpolate(this.anim_chars_offset_[x], width, cs.config.label_anim_factor);
            width += this.get_char_width(this.text[x]);
        }

        const delta_time = Date.now() - this.last_time_caret_moved_;
        const sin = cs.config.label_caret_smoothness * Math.sin(
            Math.PI * (1/4 + 2*delta_time/cs.config.label_caret_blink_rate + cs.config.label_caret_blink_rate/2)
        );
        const alpha = delta_time < cs.config.label_caret_blink_rate/2 ? 1 : Util.map(Util.clamp(sin, -1, 1), -1, 1, 0, 1);
        this.caret_color_ = Color.from(cs.theme.label_caret, {a:alpha}).to_string();
    }

    move(total_vec, snap_size_) {
        super.snap_pos(this.last_pos_, total_vec, snap_size_);
    }

    nearest_gate(elements=cs.context.inner_elements) {
        const radius = 2.2;

        const rect_pos = Vec.sub(this.pos, new Vec(radius));
        const rect_size = Vec.add(this.size, new Vec(radius*2));

        const nearby_gates = ActionGet.elements_in_rect(rect_pos, rect_size, elements)
            .filter(element => element instanceof Gate)
            .sorted(Util.compare_function(gate => Vec.sub(
                Vec.add(gate.pos, Vec.div(gate.size, 2)),
                Vec.add(this.pos, Vec.div(this.size, 2)),
            ).length()));

        return nearby_gates[0];
    }

    run_init_animation() {}

    unescape_text() {
        return this.text = this.text.replace(/(?:u\+|%u|\\u|\\)([0-9a-f]{4})/gi, (match, digits) => {
            return String.fromCharCode(parseInt(digits, 16));
        });
    }

    special_info() {
        const tag_match = this.text.match(/^tag\s*=(.*)/i);
        if (tag_match) {
            return {tag: tag_match[1]};
        }

        const name_match = this.text.match(/^name\s*=(.*)/i);
        if (name_match) {
            return {name: name_match[1]};
        }

        const size_match = this.text.match(/^size\s*=(.*)/i);
        if (size_match) {
            const size_pair_match = size_match[1].match(/(\d+)\s*,\s*(\d+)/);
            if (size_pair_match) {
                return {size: new Vec(parseInt(size_pair_match[1]), parseInt(size_pair_match[2]))};
            }

            const size_single_match = size_match[1].match(/(\d+)/);
            if (size_single_match) {
                return {size: new Vec(parseInt(size_single_match[1]))};
            }

            return {size: new Vec(3,4)};
        }

        return null;
    }

    description_info() {
        const clock = this.nearest_gate();

        if (clock instanceof Clock) {
            const time_match = this.text.match(/^([\d\.]+)\s*([A-Za-zµ]*)(s|Hz|t)(?:\s*[@/,\s]\s*([\d\.]+\s*%?))?$/);

            if (time_match) {
                const prefix = {
                    ['µ']: 1e-6,
                    u:  1e-6,
                    m:  1e-3,
                    c:  1e-2,
                    d:  1e-1,
                    da: 1e+1,
                    h:  1e+2,
                    k:  1e+3,
                    M:  1e+6,
                };

                const frames_per_second = 60;

                const [match, value_string, prefix_string, unit_string, width_string] = time_match;
                const factor = prefix_string ? prefix[prefix_string] : 1;

                if (factor) {
                    let ticks;
                    let width;

                    const value = parseFloat(value_string) * factor;

                    switch (unit_string) {
                        case 't':
                            ticks = value;
                            break;
                        case 's':
                            ticks = frames_per_second*cs.config.ticks_per_frame * value;
                            break;
                        case 'Hz':
                            ticks = frames_per_second*cs.config.ticks_per_frame / value
                            break;
                    }

                    if (width_string) {
                        if (width_string.endsWith('%')) {
                            width = ticks * parseFloat(width_string)/100;
                        }
                        else {
                            width = parseFloat(width_string);
                        }
                    }
                    else {
                        width = ticks/2;
                    }

                    clock.pulse_length = ticks;
                    clock.pulse_width = width;

                    if (clock.pulse_ticks_ >= clock.pulse_length || !clock.pulse_ticks_) {
                        clock.pulse_ticks_ = 0;
                    }

                    return {ticks, width};
                }
            }
        }

        return null;
    }

    distance(pos) {
        return Gate.distance(pos, this.pos, this.size);
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
        context.font = `${this.font_size * 256}px sans-serif`;
        return context.measureText(char).width / 256;
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

        context.translate(...Vec.add(this.anim_pos_, Vec.div(this.anim_size_, 2).add(new Vec(this.anim_total_width_/-2, 0))).xy);

        context.fillStyle = this.text_color_.to_string();
        context.font = `${this.font_size}px sans-serif`;
        context.textAlign = 'start';
        context.textBaseline = 'middle';

        for (let x = 0; x < this.text.length; x++) {
            const char = this.text[x];
            context.fillText(char, this.anim_chars_offset_[x], 0);
        }

        if (document.hasFocus() && this.is_selected() && cs.controller.current_action == Enum.action.edit_labels) {
            context.fillStyle = cs.theme.label_selection.to_string();
            this.draw_text_bounds(this.anim_selection_bounds_);

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

    get_text_index(pos) {
        const rel_x = pos.x - this.pos.x - this.size.x/2 + this.text_width(this.text)/2;

        let smallest_dist = Infinity;

        let width = 0;

        for (let x = 0; x <= this.text.length; x++) {
            const current_dist = Math.abs(rel_x - width);
            width += this.get_char_width(this.text[x]);

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

    event_mouse_down(event) {
        cs.config.DEBUG_LOG && console.log('label mouse down');

        this.mousedown_caret_ = this.caret;
        this.mousedown_detail_ = event.detail;

        switch ((event.detail-1) % 3) {
            default:
            case 0:
                this.set_caret(this.caret_hovered_, event.shiftKey);
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
    event_mouse_move(event) {
        cs.config.DEBUG_LOG && console.log('label mouse move');

        this.caret_hovered_ = this.get_text_index(cs.controller.mouse_world_pos);

        if (event.buttons & 1) {
            switch ((this.mousedown_detail_-1) % 3) {
                default:
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
    }

    clamp_caret() {
        this.caret = Util.clamp(this.caret, 0, this.text.length);
        this.selection_start = Util.clamp(this.selection_start, 0, this.text.length);
    }

    delete_selection() {
        this.clamp_caret();

        this.anim_chars_offset_.splice(this.selection_lower(), this.selection_upper()-this.selection_lower());

        this.text = `${this.text.substr(0, this.selection_lower())}${this.text.substring(this.selection_upper(), this.text.length)}`;
        this.set_caret(this.selection_lower());
    }
    write_text(string) {
        this.clamp_caret();

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
        this.clamp_caret();

        if (this.selection_width() == 0) {
            this.set_caret(ctrlKey ? this.next_word_stop(this.caret,dir) : this.caret+dir, true);
        }
        this.delete_selection();
    }
    move_direction(dir, shiftKey, ctrlKey) {
        this.clamp_caret();

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
                            break;
                        case 'c':
                            this.clipboard = this.text.substring(this.selection_lower(), this.selection_upper()) || this.text;
                            if (cs.config.use_system_clipboard) {
                                navigator.clipboard.writeText(this.clipboard);
                            }

                            break;
                        case 'x':
                            if (this.selection_width() == 0) {
                                this.select_all();
                            }

                            this.clipboard = this.text.substring(this.selection_lower(), this.selection_upper());
                            if (cs.config.use_system_clipboard) {
                                navigator.clipboard.writeText(this.clipboard);
                            }

                            this.delete_selection();
                            break;
                        case 'v':
                            if (cs.config.use_system_clipboard) {
                                navigator.clipboard.readText().then(string => {
                                    this.write_text(string);
                                });
                            }
                            else {
                                this.write_text(this.clipboard);
                            }
                            break;
                    }
                }
                else {
                    this.write_text(event.key);
                }
                break;

            case 'ArrowLeft':
                this.move_direction(-1, event.shiftKey, event.ctrlKey);
                break;
            case 'ArrowRight':
                this.move_direction(1, event.shiftKey, event.ctrlKey);
                break;

            case 'Home':
                this.set_caret(0, event.shiftKey);
                break;
            case 'End':
                this.set_caret(this.text.length, event.shiftKey);
                break;

            case 'Backspace':
                this.delete_direction(-1, event.ctrlKey);
                break;
            case 'Delete':
                this.delete_direction(1, event.ctrlKey);
                break;

            case 'Enter':
                return true;
        }

        this.unescape_text();
        return false;
    }
}
