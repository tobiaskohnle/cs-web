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

const Util = {
    // TEMP
    create_snapshot: function() {
        cs.config.DEBUG_LOG && console.log(`%c>> CREATED SNAPSHOT`, 'color:#fb2; font-weight:bold');

        this.snapshot = Util.deep_copy(cs);
    },
    load_snapshot: function() {
        if (this.snapshot) {
            cs.config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT`, 'color:#2d2; font-weight:bold');
            const snapshot = Util.deep_copy(this.snapshot);

            cs.context = snapshot.context;
            cs.selected_elements = snapshot.selected_elements;

            for (const key in snapshot.controller) {
                cs.controller[key] = snapshot.controller[key];
            }
        }
        else {
            cs.config.DEBUG_LOG && console.log(`%c<< LOADED SNAPSHOT (FAILED)`, 'color:#c229; font-weight:bold');
        }
    },
    clear_snapshot: function() {
        this.snapshot = null;
    },

    round: function(number, factor=1) {
        return Math.round(number / factor) * factor;
    },
    mod: function(a, n) {
        return a - n * Math.floor(a / n);
    },
    map: function(v, s0,s1, d0,d1) {
        return (d0-d1) / (s0-s1) * (v-s0) + d0;
    },
    clamp: function(v, min,max) {
        return Math.min(max, Math.max(min, v));
    },
    between: function(v, min,max) {
        return min <= v && v < max;
    },

    side_index: function(vec) {
        if (vec.x > 0) return Enum.side.east;
        if (vec.y > 0) return Enum.side.south;
        if (vec.x < 0) return Enum.side.west;
        if (vec.y < 0) return Enum.side.north;
    },

    all_inner_elements: function(custom_gate) {
        return [
            ...custom_gate.inner_elements,
            ...custom_gate.inner_elements
                .filter(element => element instanceof CustomGate)
                .flatMap(custom_gate => Util.all_inner_elements(custom_gate))
        ];
    },

    rects_overlap: function(pos_a, size_a, pos_b, size_b) {
        return Math.min(pos_a.x, pos_a.x+size_a.x) <= Math.max(pos_b.x, pos_b.x+size_b.x)
            && Math.max(pos_a.x, pos_a.x+size_a.x) >= Math.min(pos_b.x, pos_b.x+size_b.x)
            && Math.min(pos_a.y, pos_a.y+size_a.y) <= Math.max(pos_b.y, pos_b.y+size_b.y)
            && Math.max(pos_a.y, pos_a.y+size_a.y) >= Math.min(pos_b.y, pos_b.y+size_b.y);
    },

    download_string: function(text, file_name) {
        const blob = new Blob([text], {type: 'txt'});

        const a = document.createElement('a');
        a.download = file_name;
        a.href = URL.createObjectURL(blob);
        a.dataset.downloadurl = `${a.download}:${a.href}`;
        // a.href = `data:text/plain,${text}`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(a.href);
    },

    attach_segments: function(segment_a, segment_b) {
        segment_a.neighbor_segments.push(segment_b);
        segment_b.neighbor_segments.push(segment_a);
    },
    detach_segments: function(segment_a, segment_b) {
        segment_a.neighbor_segments.remove(segment_b);
        segment_b.neighbor_segments.remove(segment_a);
    },

    add_segment: function(segments) {
        const segment = new WireSegment;

        if (segments.length) {
            segment.is_vertical = !segments.last().is_vertical;

            Util.attach_segments(segments.last(), segment);
        }

        segments.push(segment);
        return segment;
    },
    remove_segment: function(segments) {
        if (segments.length >= 2) {
            Util.detach_segments(segments.pop(), segments.last());
        }
        else {
            segments.pop();
        }
    },

    bounding_rect: function(elements) {
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

    replace_reference: function(element, reference, new_reference) {
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

    deep_copy: function(element) {
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

            var result = new element.constructor();

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

    extended_stringify: function(value, replacer=null, space=null) {
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

    extended_parse: function(value, reviver=null) {
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
