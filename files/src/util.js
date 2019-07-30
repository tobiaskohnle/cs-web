'use strict';

Array.prototype.copy = function() {
    return [...this];
}
Array.prototype.sorted = function(compare_function) {
    return this.copy().sort(compare_function);
}
Array.prototype.at = function(index) {
    return this[Util.mod(index, this.length)];
}
Array.prototype.last = function() {
    return this.at(-1);
}
Array.prototype.remove = function(element) {
    const index = this.indexOf(element);

    if (index >= 0) {
        this.splice(index, 1);
    }
}

if (!String.prototype.matchAll) {
    String.prototype.matchAll = function(regex) {
        const matches = [];

        let match;
        while ((match = regex.exec(this)) !== null) {
            matches.push(match[0]);
        }

        return matches;
    }
}

const Util = {
    // TEMP
    create_snapshot() {
        cs.config.DEBUG_LOG && console.log(`%c>> CREATED SNAPSHOT`, 'color:#fb2; font-weight:bold');

        this.snapshot = Util.deep_copy({
            context: cs.context,
            wire_start_node: cs.controller.wire_start_node,
            new_wire_segments: cs.controller.new_wire_segments,
            snapped_mouse_world_pos: cs.controller.snapped_mouse_world_pos,
        });
    },
    load_snapshot(transfer_element) {
        if (this.snapshot) {
            cs.config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT`, 'color:#2d2; font-weight:bold');

            const snapshot = Util.deep_copy(this.snapshot);

            cs.context = snapshot.context;
            cs.controller.wire_start_node = snapshot.wire_start_node;
            cs.controller.new_wire_segments = snapshot.new_wire_segments;
            cs.controller.snapped_mouse_world_pos = snapshot.snapped_mouse_world_pos;

            return transfer_element && ActionGet.elements().find(element => element.id_==transfer_element.id_);
        }
        else {
            cs.config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT (FAILED)`, 'color:#c229; font-weight:bold');

            return transfer_element;
        }
    },
    clear_snapshot() {
        this.snapshot = null;
    },

    round(number, factor=1) {
        return Math.round(number / factor) * factor;
    },
    mod(a, n) {
        return a - n * Math.floor(a / n);
    },
    map(v, s0,s1, d0,d1) {
        return (d0-d1) / (s0-s1) * (v-s0) + d0;
    },
    clamp(v, min,max) {
        return Math.min(max, Math.max(min, v));
    },
    between(v, min,max) {
        return min <= v && v < max;
    },

    compare_function(value_getter) {
        return function(a, b) {
            return value_getter(a) - value_getter(b);
        };
    },

    get_nested(object, nested_key) {
        let result = object;

        for (const key of nested_key.split('.')) {
            result = result[key];
        }

        return result;
    },
    set_nested(object, nested_key, value) {
        let result = object;
        let last_result = null;

        if (!nested_key) {
            return;
        }

        const keys = nested_key.split('.');

        for (const key of keys) {
            last_result = result;
            result = result[key];
        }

        last_result[keys.last()] = value;
    },

    side_index(vec) {
        if (vec.x > 0) return Enum.side.east;
        if (vec.y > 0) return Enum.side.south;
        if (vec.x < 0) return Enum.side.west;
        if (vec.y < 0) return Enum.side.north;
    },

    rects_overlap(pos_a, size_a, pos_b, size_b) {
        return Math.min(pos_a.x, pos_a.x+size_a.x) <= Math.max(pos_b.x, pos_b.x+size_b.x)
            && Math.max(pos_a.x, pos_a.x+size_a.x) >= Math.min(pos_b.x, pos_b.x+size_b.x)
            && Math.min(pos_a.y, pos_a.y+size_a.y) <= Math.max(pos_b.y, pos_b.y+size_b.y)
            && Math.max(pos_a.y, pos_a.y+size_a.y) >= Math.min(pos_b.y, pos_b.y+size_b.y);
    },

    download_string(text, file_name) {
        const blob = new Blob([text], {type: 'txt'});

        const a = document.createElement('a');
        a.download = file_name;
        a.href = URL.createObjectURL(blob);
        a.dataset.downloadurl = `${a.download}:${a.href}`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(a.href);
    },

    attach_segments(segment_a, segment_b) {
        if (segment_a instanceof WireSegment && segment_b instanceof WireSegment) {
            segment_a.neighbor_segments.push(segment_b);
            segment_b.neighbor_segments.push(segment_a);
        }
        else if (segment_a instanceof WireSegment && segment_b instanceof ConnectionNode) {
            segment_a.set_connected_pos(segment_b.anchor_pos_);
        }
        else if (segment_b instanceof WireSegment && segment_a instanceof ConnectionNode) {
            segment_b.set_connected_pos(segment_a.anchor_pos_);
        }
    },
    detach_segments(segment_a, segment_b) {
        if (segment_a instanceof WireSegment && segment_b instanceof WireSegment) {
            segment_a.neighbor_segments.remove(segment_b);
            segment_b.neighbor_segments.remove(segment_a);
        }
        else if (segment_a instanceof WireSegment && segment_b instanceof ConnectionNode) {
            segment_a.set_connected_pos(null);
        }
        else if (segment_b instanceof WireSegment && segment_a instanceof ConnectionNode) {
            segment_b.set_connected_pos(null);
        }
    },

    add_segment(segments) {
        const segment = new WireSegment;

        if (segments.length) {
            segment.is_vertical = !segments.last().is_vertical;

            Util.attach_segments(segments.last(), segment);
        }

        segments.push(segment);
        return segment;
    },
    remove_segment(segments) {
        if (segments.length >= 2) {
            Util.detach_segments(segments.pop(), segments.last());
        }
        else {
            segments.pop();
        }
    },

    convert_to_custom_gate(custom_gate) {
        const inner_elements = custom_gate.inner_elements.sorted((a,b) => a.pos.y==b.pos.y ? a.pos.x-b.pos.x : a.pos.y-b.pos.y);

        for (const inner_element of inner_elements) {
            if (inner_element instanceof Label) {
                const special_info = inner_element.special_info();

                if (special_info) {
                    if (special_info.tag) {
                        custom_gate.tag = special_info.tag;
                    }
                    if (special_info.size) {
                        custom_gate.size = special_info.size;
                    }
                }
                else {
                    const nearest_gate = inner_element.nearest_gate(inner_elements);

                    if (nearest_gate) {
                        nearest_gate.name = inner_element.text;
                    }
                }
            }
        }

        for (const inner_element of inner_elements) {
            if (inner_element instanceof InputGate) {
                for (const output of inner_element.outputs) {
                    const input = custom_gate.add_input_node();

                    input.is_inverted = output.is_inverted;
                    input.tag = inner_element.name || null;

                    input.next_nodes = output.next_nodes;
                    output.next_nodes = [];

                    if (inner_element instanceof InputPulse) {
                        input.is_rising_edge = true;
                    }
                }
            }

            if (inner_element instanceof OutputGate) {
                for (const input of inner_element.inputs) {
                    const output = custom_gate.add_output_node();

                    output.is_inverted = input.is_inverted;
                    output.tag = inner_element.name || null;

                    const prev_node = input.previous_node(inner_elements);

                    if (prev_node) {
                        prev_node.next_nodes.remove(input);
                        prev_node.next_nodes.push(output);
                    }
                }
            }
        }
    },

    bounding_rect(elements) {
        const min_pos = new Vec(Math.min());
        const max_pos = new Vec(Math.max());

        for (const element of elements) {
            const bounds = element.hitbox_rect();

            min_pos.x = Math.min(min_pos.x, Math.min(bounds.pos.x, bounds.pos.x+bounds.size.x));
            min_pos.y = Math.min(min_pos.y, Math.min(bounds.pos.y, bounds.pos.y+bounds.size.y));

            max_pos.x = Math.max(max_pos.x, Math.max(bounds.pos.x, bounds.pos.x+bounds.size.x));
            max_pos.y = Math.max(max_pos.y, Math.max(bounds.pos.y, bounds.pos.y+bounds.size.y));
        }

        return {
            pos: min_pos,
            size: Vec.sub(max_pos, min_pos),
        };
    },

    replace_reference(element, reference, new_reference) {
        const references = [];

        (function replace(element) {
            if (!element || typeof element !== 'object') {
                return;
            }

            if (references.includes(element)) {
                return;
            }
            references.push(element);

            for (const key in element) {
                if (element.hasOwnProperty(key)) {
                    if (element[key] == reference) {
                        element[key] = new_reference;
                        continue;
                    }

                    replace(element[key]);
                }
            }
        })(element);
    },

    deep_copy(element) {
        const references = [canvas, sidebar_canvas];
        const cached_results = [canvas, sidebar_canvas];

        return (function copy(element) {
            if (!element || typeof element !== 'object') {
                return element;
            }

            const index = references.indexOf(element);
            if (index >= 0) {
                return cached_results[index];
            }

            references.push(element);

            const result = new element.constructor();

            cached_results.push(result);

            if (Set.prototype.isPrototypeOf(element)) {
                for (const item of element) {
                    result.add(copy(item));
                }
            }
            else for (const key in element) {
                if (element.hasOwnProperty(key)) {
                    result[key] = copy(element[key]);
                }
            }

            return result;
        })(element);
    },

    extended_stringify(value, replacer=null, space=null) {
        const references = [];

        return JSON.stringify(function prepare(value) {
            const index = references.indexOf(value);

            if (index >= 0) {
                return {$ref: index};
            }
            else if (value instanceof Object) {
                value.$id = references.length;
                references.push(value);
            }

            if (value instanceof Array) {
                return value.map(element => prepare(element));
            }
            else if (value instanceof Object) {
                if (!value) {
                    return value;
                }

                for (const key in value) {
                    value[key] = prepare(value[key]);
                }

                const constructor_name = value.constructor.name;

                if (!['Object', 'Array', 'String', 'Number'].includes(constructor_name)) {
                    value.$type = constructor_name;
                }
            }

            return value;
        }(Util.deep_copy(value)), replacer, space);
    },

    extended_parse(value, reviver=null) {
        const references = [];

        return (function edit(value) {
            if (value != undefined) {
                if (value.hasOwnProperty('$ref')) {
                    const return_value = references[value.$ref];
                    delete value.$ref;
                    return return_value;
                }
                else if (value.hasOwnProperty('$id')) {
                    references[value.$id] = value;
                    delete value.$id;
                }
            }

            if (value instanceof Array) {
                return value.map(element => edit(element));
            }
            else if (value instanceof Object) {
                let constructor_name;

                for (const key in value) {
                    if (key == '$type') {
                        constructor_name = value[key];
                        delete value[key];
                        continue;
                    }

                    value[key] = edit(value[key]);
                }

                if (constructor_name) {
                    Object.setPrototypeOf(value, eval(`${constructor_name}.prototype`));
                }
            }

            return value;
        })(JSON.parse(value, reviver));
    },
};
