'use strict';

class Tab {
    constructor() {
        this.camera = new Camera(new Vec, 30);
        this.reset();
    }

    reset() {
        this.model = new Model;
        this.controller = new Controller(this.model);
    }
}
