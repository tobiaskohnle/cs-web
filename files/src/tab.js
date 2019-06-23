'use strict';

class Tab {
    constructor() {
        this.camera = new Camera;
        this.reset();
    }

    reset() {
        this.model = new Model;
        this.controller = new Controller(this.model);
        this.sidebar = new Sidebar;
    }

    create_snapshot() {
        config.DEBUG_LOG && console.log(`%c>> CREATED SNAPSHOT`, 'color:#fb2; font-weight:bold');

        this.snapshot = deep_copy({model:this.model, controller:this.controller});
    }

    load_snapshot() {
        if (this.snapshot) {
            config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT`, 'color:#2d2; font-weight:bold');
            const snapshot = deep_copy(this.snapshot);

            this.model = snapshot.model;

            for (const key in snapshot.controller) {
                this.controller[key] = snapshot.controller[key];
            }
        }
        else {
            config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT (FAILED)`, 'color:#c229; font-weight:bold');
        }
    }

    clear_snapshot() {
        this.snapshot = null;
    }
}
