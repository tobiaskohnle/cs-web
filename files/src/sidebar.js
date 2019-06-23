'use strict';

class Sidebar {
    constructor() {
        this.offset = 0;
        this.header_height = 40;
        // this.sections = Array.from(Array(7), ()=>Math.random()*3+1).map(e => ({height: e*40*4|0}));

        this.scroll = 0;
        this.anim_scroll = 0;

        this.anim_factor = .37;

        this.margin = 2;
        this.scale = 20;

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

        this.categories = [
            {
                header: 'Default',
                elements: [
                    new AndGate,
                    nand,
                    new OrGate,
                    nor,
                    new XorGate,
                    xnor,
                    new NopGate,
                    not,
                ],
            },
            {
                header: 'In/Out',
                elements: [
                    new InputSwitch,
                    new InputButton,
                    new InputPulse,
                    new Clock,
                    new OutputLight,
                    new SegmentDisplay,
                ],
            },
            {
                header: 'Other',
                elements: [
                    label,
                ],
            },
        ];

        this.sections = this.categories.map(category => {
            let section_height = 0;

            const elements_sections = category.elements.map(element => {
                const height = (element.size.y+this.margin) * this.scale;
                section_height += height;
                return {height, element};
            });

            return {height:section_height, category, elements_sections};
        });
    }

    header_position(section, scroll) {
        return clamp(
            section.y-scroll,
            section.index * this.header_height,
            sidebar_canvas.height - (this.sections.length-section.index) * this.header_height,
        );
    }

    scroll_height() {
        return Math.max(sidebar_canvas.height, this.segments_height()) - sidebar_canvas.height;
    }
    segments_height() {
        return this.sections.reduce((acc,val) => acc+val.height+this.header_height, 0);
    }

    scroll_to(value) {
        this.scroll = value;
    }
    scroll_by(value) {
        this.scroll += value;
    }

    mouse_down(event) {
        if (event.button == 0) {
            if (this.hovered_section) {
                this.scroll_to(this.hovered_section.y - this.hovered_section.index*this.header_height);
            }
            else if (this.hovered_element) {
                if (this.imported_element && this.imported_element == this.hovered_element) {
                    current_tab.controller.current_action = Enum.action.none;
                    current_tab.controller.imported_element = null;
                    this.imported_element = null;
                }
                else {
                    current_tab.controller.current_action = Enum.action.import_element;
                    current_tab.controller.imported_element = deep_copy(this.hovered_element);
                    this.imported_element = this.hovered_element;
                }
            }
        }
        else if (event.buttons & -2) {
            current_tab.controller.capture_mouse(sidebar_canvas);
        }
    }
    mouse_move(event) {
        if (event.buttons & -2) {
            this.scroll_by(-event.movementY);
        }

        const y = event.y - sidebar_canvas.offsetTop;

        this.hovered_section = null;
        this.hovered_element = null;

        for (const section of this.sections) {
            if (between(y, section.scroll_y, section.scroll_y+this.header_height)) {
                this.hovered_section = section;
                break;
            }

            for (const element_section of section.elements_sections) {
                if (between(y, element_section.scroll_y, element_section.scroll_y+element_section.height)) {
                    this.hovered_element = element_section.element;
                    break;
                }
            }
        }
    }
    mouse_leave(event) {
        this.hovered_section = null;
        this.hovered_element = null;
        this.imported_element = null;
    }

    update() {
        this.scroll = Math.max(0, Math.min(this.segments_height()-sidebar_canvas.height, this.scroll));

        this.anim_scroll = anim_interpolate(this.anim_scroll, this.scroll, this.anim_factor);

        let section_y = 0;

        for (let i = 0; i < this.sections.length; i++) {
            const section = this.sections[i];

            let elements_section_y = section_y + this.header_height;

            for (let j = 0; j < section.elements_sections.length; j++) {
                const elements_section = section.elements_sections[j];

                elements_section.index = j;
                elements_section.y = elements_section_y;
                elements_section.scroll_y = elements_section_y - this.scroll;
                elements_section.anim_scroll_y = elements_section_y - this.anim_scroll;

                elements_section_y += elements_section.height;
            }

            section.index = i;
            section.y = section_y;
            section_y += section.height + this.header_height;

            section.scroll_y      = this.header_position(section, this.scroll);
            section.anim_scroll_y = this.header_position(this.sections[i], this.anim_scroll);
        }
    }

    draw() {
        sidebar_context.clearRect(0, 0, sidebar_canvas.width, sidebar_canvas.height);

        for (const section of this.sections) {
            let y = section.y - this.anim_scroll + this.header_height;

            for (const element_section of section.elements_sections) {
                const element = element_section.element;

                if (this.imported_element == element) {
                    sidebar_context.fillStyle = '#28f7';
                    sidebar_context.fillRect(0, element_section.anim_scroll_y, sidebar_canvas.width, element_section.height);
                }
                else if (this.hovered_element == element) {
                    sidebar_context.fillStyle = '#49e4';
                    sidebar_context.fillRect(0, element_section.anim_scroll_y, sidebar_canvas.width, element_section.height);
                }

                sidebar_context.save();

                sidebar_context.translate(sidebar_canvas.width/2 - element.size.x/2*this.scale, y + this.margin/2*this.scale);
                sidebar_context.scale(this.scale, this.scale);

                // TEMP
                const ctx = context;
                context = sidebar_context;
                element.update();
                element.cancel_animation();
                element.draw();
                context = ctx;
                // /TEMP

                sidebar_context.restore();

                y += (element.size.y+this.margin) * this.scale;
            }
        }

        for (const section of this.sections) {
            const hovered = section == this.hovered_section;

            sidebar_context.fillStyle = '#333';
            sidebar_context.fillRect(0, section.anim_scroll_y, sidebar_canvas.width, this.header_height);

            sidebar_context.fillStyle = hovered ? '#9cf' : '#eee';
            sidebar_context.fillRect(1, section.anim_scroll_y+1, sidebar_canvas.width-2, this.header_height-2);

            sidebar_context.fillStyle = '#222';
            sidebar_context.font = `${this.header_height/1.9}px segoe ui, sans-serif`;
            sidebar_context.textAlign = 'center';
            sidebar_context.textBaseline = 'middle';
            sidebar_context.fillText(section.category.header, sidebar_canvas.width/2, section.anim_scroll_y + this.header_height/2);
        }
    }
}
