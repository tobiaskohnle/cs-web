'use stict';

class Color {
    constructor(h=0, s=0, v=0, a=1) {
        this.set_anim_hsva({h, s, v, a});
        this.set_hsva({h, s, v, a});
    }

    set_anim_hsva({h, s, v, a}) {
        this.anim_h = h;
        this.anim_s = s;
        this.anim_v = v;
        this.anim_a = a;
    }
    set_hsva({h, s, v, a}) {
        this.h = h;
        this.s = s;
        this.v = v;
        this.a = a;
    }

    copy_hsva(color) {
        this.h = color.h;
        this.s = color.s;
        this.v = color.v;
        this.a = color.a;
    }

    update() {
        this.anim_h = anim_interpolate_mod(this.anim_h, this.h);
        this.anim_s = anim_interpolate(this.anim_s, this.s);
        this.anim_v = anim_interpolate(this.anim_v, this.v);
        this.anim_a = anim_interpolate(this.anim_a, this.a);
    }

    get_string() {
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
