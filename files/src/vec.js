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
    mult_vec(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;
    }
    div(val) {
        this.x /= val;
        this.y /= val;
        return this;
    }
    div_vec(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
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
        this.x = round(this.x, factor);
        this.y = round(this.y, factor);
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
    static mult_vec(a, b) {
        return a.copy().mult_vec(b);
    }
    static div(a, val) {
        return a.copy().div(val);
    }
    static div_vec(a, b) {
        return a.copy().div_vec(b);
    }
    static floor(a) {
        return a.copy().floor();
    }
    static abs(a) {
        return a.copy().abs();
    }
    static round(a, factor=1) {
        return a.copy().round(factor);
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
