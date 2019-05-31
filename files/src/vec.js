'use strict';

class Vec {
    constructor(x=0, y=x) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new Vec(this.x, this.y);
    }
    set(vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }
    sub(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }
    mult(val) {
        this.x *= val;
        this.y *= val;
        return this;
    }
    div(val) {
        this.x /= val;
        this.y /= val;
        return this;
    }
    rot(val) {
        const sin = Math.sin(Math.PI/-2 * val);
        const cos = Math.cos(Math.PI/-2 * val);
        [this.x, this.y] = [cos*this.x - sin*this.y, sin*this.x + cos*this.y];
        return this;
    }
    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }
    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }
    round(factor=1) {
        this.x = Math.round(this.x / factor) * factor;
        this.y = Math.round(this.y / factor) * factor;
        return this;
    }
    mirror(flags) {
        if (flags & 2) this.x = -this.x;
        if (flags & 1) this.y = -this.y;
        return this;
    }
    equals(vec) {
        return this.x==vec.x && this.y==vec.y;
    }
    length() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    get xy() {
        return [this.x, this.y];
    }

    static copy(a) {
        return new Vec(a.x, a.y);
    }
    static add(a, b) {
        return a.copy().add(b);
    }
    static sub(a, b) {
        return a.copy().sub(b);
    }
    static mult(a, val) {
        return a.copy().mult(val);
    }
    static div(a, val) {
        return a.copy().div(val);
    }
    static rot(a, val) {
        return a.copy().rot(val);
    }
    static floor(a) {
        return a.copy().floor();
    }
    static abs(a) {
        return a.copy().abs();
    }
    static round(a) {
        return a.copy().round();
    }
    static mirror(a, flags) {
        return a.copy().mirror(flags);
    }
    static equals(a, b) {
        return a.equals(b);
    }
    static length(a) {
        return a.length();
    }
}
