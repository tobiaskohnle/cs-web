'use strict';

class Color {
    constructor(h=0, s=0, v=0, a=1) {
        this.set_anim_hsva({h, s, v, a});
        this.set_hsva({h, s, v, a});
    }

    static from(...colors) {
        const new_color = new Color;

        for (const color of colors) {
            new_color.from_hsva(color);
        }

        return new_color;
    }

    static parse(hex) {
        hex = hex.replace(/^#/, '');

        if (hex.length == 3) {
            hex = `${hex}f`;
        }
        if (hex.length == 6) {
            hex = `${hex}ff`;
        }
        if (hex.length == 4) {
            hex = hex.split('').map(digit => [digit,digit]).flat().join('');
        }
        if (hex.length == 8) {
            const rgba = Array.from(hex.matchAll(/.{2}/g)).flatMap(digit => parseInt(digit,16)/255);

            if (rgba.every(value => 0 <= value && value <= 1)) {
                let h = 0;
                let s = 0;
                let v = 0;

                const [r, g, b, a] = rgba;

                const min_color = Math.min(r, g, b);
                const max_color = Math.max(r, g, b);
                const delta = max_color - min_color;

                if (delta) {
                    if (r == max_color) {
                        h = Util.mod((g - b) / delta, 6);
                    }
                    else if (g == max_color) {
                        h = 2 + (b - r) / delta;
                    }
                    else if (b == max_color) {
                        h = 4 + (r - g) / delta;
                    }
                }
                h /= 6;

                if (max_color) {
                    s = delta / max_color;
                }

                v = max_color;

                return new Color(h, s, v, a);
            }
        }

        return null;
    }

    from_hsva({h, s, v, a}) {
        if (h !== undefined) this.anim_h = this.h = h;
        if (s !== undefined) this.anim_s = this.s = s;
        if (v !== undefined) this.anim_v = this.v = v;
        if (a !== undefined) this.anim_a = this.a = a;
    }

    set_anim_hsva({h=0, s=0, v=0, a=1}) {
        this.anim_h = h;
        this.anim_s = s;
        this.anim_v = v;
        this.anim_a = a;
    }
    set_hsva({h=0, s=0, v=0, a=1}) {
        this.h = h;
        this.s = s;
        this.v = v;
        this.a = a;
    }

    update() {
        this.anim_h = anim_interpolate_mod(this.anim_h, this.h, cs.config.color_anim_factor);
        this.anim_s = anim_interpolate    (this.anim_s, this.s, cs.config.color_anim_factor);
        this.anim_v = anim_interpolate    (this.anim_v, this.v, cs.config.color_anim_factor);
        this.anim_a = anim_interpolate    (this.anim_a, this.a, cs.config.color_anim_factor);
    }

    to_string() {
        let [h, s, v, a] = [this.anim_h, this.anim_s, this.anim_v, this.anim_a];

        let l = (2-s) * v/2;

        if (l) {
            if (l == 1) {
                s = 0;
            }
            else if (l < 0.5) {
                s = s*v / (l*2);
            }
            else {
                s = s*v / (2 - l*2);
            }
        }

        return `hsla(${h*360},${s*100}%,${l*100}%,${a})`;
    }
}
