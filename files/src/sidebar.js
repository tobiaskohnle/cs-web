'use strict';

class Sidebar {
    constructor() {
        this.scroll = 0;
        this.anim_scroll = 0;

        this.load_categories();
    }

    load_categories() {
        const nand = new AndGate;
        nand.outputs[0].is_inverted = nand.outputs[0].state = true;
        const nor = new OrGate;
        nor.outputs[0].is_inverted = nor.outputs[0].state = true;
        const xnor = new XorGate;
        xnor.outputs[0].is_inverted = xnor.outputs[0].state = true;
        const not = new NopGate;
        not.outputs[0].is_inverted = not.outputs[0].state = true;

        const label = new Label;
        label.text = 'Text';

        const clock_label = new Label;
        clock_label.text = '1Hz 50%';
        clock_label.size.x = 4;

        const clock = new Clock;
        clock.pos = new Vec(1,2);

        this.categories = [
            {
                header: 'Gates',
                groups: [
                    {elements: [new AndGate]},
                    {elements: [nand]},
                    {elements: [new OrGate]},
                    {elements: [nor]},
                    {elements: [new XorGate]},
                    {elements: [xnor]},
                    {elements: [new NopGate]},
                    {elements: [not]},
                ],
            },
            {
                header: 'In/Out',
                groups: [
                    {elements: [new InputSwitch]},
                    {elements: [new InputButton]},
                    {elements: [new InputPulse]},
                    {elements: [new Clock]},
                    {elements: [clock, clock_label]},
                    {elements: [new OutputLight]},
                    {elements: [new SegmentDisplay]},
                ],
            },
            {
                header: 'Label',
                groups: [
                    {elements: [label]},
                ],
            },
        ];

        this.update();
    }

    header_screen_y(category, scroll) {
        return Util.clamp(
            category.y + scroll,
            category.index * cs.config.sidebar_header_height,
            sidebar_canvas.height - (this.categories.length-category.index) * cs.config.sidebar_header_height,
        );
    }

    scroll_height() {
        return Math.max(sidebar_canvas.height, this.height()) - sidebar_canvas.height;
    }
    height() {
        return this.categories.reduce((total_height,category) => total_height+category.height+cs.config.sidebar_header_height, 0);
    }

    scroll_to(value) {
        this.scroll = value;
    }
    scroll_by(value) {
        this.scroll += value;
    }

    mouse_down(event) {
        if (event.button == 0) {
            if (this.hovered_category) {
                this.scroll_to(this.hovered_category.index*cs.config.sidebar_header_height - this.hovered_category.y);
            }
            else if (this.hovered_group) {
                cs.controller.current_action = Enum.action.import_element;
                cs.controller.imported_group = Util.deep_copy(this.hovered_group);
                this.imported_group = this.hovered_group;
                sidebar_canvas.releasePointerCapture(event.pointerId);
            }
        }
    }
    mouse_move(event) {
        if (event.buttons & -2) {
            this.scroll_by(event.movementY);
        }

        const layer_y = event.y - sidebar_canvas.offsetTop;

        this.hovered_category = null;
        this.hovered_group = null;

        for (const category of this.categories) {
            if (Util.between(layer_y, category.screen_y, category.screen_y+cs.config.sidebar_header_height)) {
                this.hovered_category = category;
                break;
            }

            for (const group of category.groups) {
                if (Util.between(layer_y, group.screen_y, group.screen_y+group.height)) {
                    this.hovered_group = group;
                    break;
                }
            }
        }
    }
    mouse_up(event) {
        cs.controller.current_action = Enum.action.none;
        cs.controller.imported_group = null;
        this.imported_group = null;
    }

    mouse_leave(event) {
        this.hovered_category = null;
        this.hovered_group = null;
        this.imported_group = null;
    }

    update_elements() {
        this.categories.forEach(category => {
            ActionGet.elements(category.groups.flat()).forEach(element => {
                element.update(true);
            });
        });
    }
    update() {
        let y = 0;

        this.categories.forEach((category, index) => {
            category.index = index;
            category.y = y;
            category.screen_y      = this.header_screen_y(category, this.scroll);
            category.anim_screen_y = this.header_screen_y(category, this.anim_scroll);

            let height = 0;
            let groups_y = cs.config.sidebar_header_height;

            category.groups.forEach((group, index) => {
                group.index = index;
                group.bounds = Util.bounding_rect(group.elements);
                group.height = (group.bounds.size.y+cs.config.sidebar_margin) * cs.config.sidebar_scale;

                group.screen_y = groups_y + category.y + this.scroll;
                group.anim_screen_y = groups_y + category.y + this.anim_scroll;

                height += group.height;
                groups_y += group.height;

                ActionGet.elements(group.elements).forEach(element => element.update(true));
            });

            category.height = height;
            y += groups_y;
        });

        this.scroll = Util.clamp(this.scroll, Math.min(0, sidebar_canvas.height-this.height()), 0);
        this.anim_scroll = View.anim_interpolate(this.anim_scroll, this.scroll, cs.config.sidebar_anim_factor);
    }

    draw() {
        const window_context = context;
        context = sidebar_context;

        context.clearRect(0, 0, sidebar_canvas.width, sidebar_canvas.height);

        for (const category of this.categories) {
            for (const group of category.groups) {
                if (this.imported_group == group) {
                    context.fillStyle = cs.theme.sidebar_imported_group.to_string();
                    context.fillRect(0, group.anim_screen_y, sidebar_canvas.width, group.height);
                }
                else if (this.hovered_group == group) {
                    context.fillStyle = cs.theme.sidebar_hovered_group.to_string();
                    context.fillRect(0, group.anim_screen_y, sidebar_canvas.width, group.height);
                }

                context.save();

                context.translate(
                    sidebar_canvas.width/2 - group.bounds.size.x/2*cs.config.sidebar_scale,
                    group.anim_screen_y + cs.config.sidebar_margin/2*cs.config.sidebar_scale,
                );
                context.translate(
                    -group.bounds.pos.x * cs.config.sidebar_scale,
                    -group.bounds.pos.y * cs.config.sidebar_scale,
                );
                context.scale(cs.config.sidebar_scale, cs.config.sidebar_scale);

                for (const element of ActionGet.elements(group.elements)) {
                    element.draw();
                }

                context.restore();
            }
        }

        for (const category of this.categories) {
            context.fillStyle = cs.theme.sidebar_header_outline.to_string();
            context.fillRect(0, category.anim_screen_y, sidebar_canvas.width, cs.config.sidebar_header_height);

            context.fillStyle = this.hovered_category == category
                ? cs.theme.sidebar_header_hovered.to_string()
                : cs.theme.sidebar_header.to_string();
            context.fillRect(1, category.anim_screen_y+1, sidebar_canvas.width-2, cs.config.sidebar_header_height-2);

            context.font = `${cs.config.sidebar_header_height/1.9}px segoe ui, sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = cs.theme.sidebar_header_font.to_string();
            context.fillText(category.header, sidebar_canvas.width/2, category.anim_screen_y + cs.config.sidebar_header_height/2);
        }

        context = window_context;
    }
}
