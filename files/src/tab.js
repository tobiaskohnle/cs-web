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

    create_snapshot() {
        this.snapshot = deep_copy({controller:this.controller, model:this.model});
    }

    load_snapshot() {
        if (this.snapshot) {
            this.model = this.snapshot.model;
            this.controller = this.snapshot.controller;
        }
    }
}
