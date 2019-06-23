'use strict';

// TEMP
globalThis.__defineGetter__('E', ()=>current_tab.model.selected_element());
globalThis.__defineGetter__('M', ()=>current_tab.model);
globalThis.__defineGetter__('C', ()=>current_tab.controller);
globalThis.__defineGetter__('S', ()=>current_tab.sidebar);
// /TEMP

Array.prototype.copy = function() {
    return [...this];
}
Array.prototype.sorted = function(compare_function) {
    return this.copy().sort(compare_function);
}
Array.prototype.at = function(index) {
    return this[mod(index, this.length)];
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

function round(number, factor=1) {
    return Math.round(number / factor) * factor;
}
function mod(a, n) {
    return a - n * Math.floor(a / n);
}
function map(v, s0,s1, d0,d1) {
    return (d0-d1) / (s0-s1) * (v-s0) + d0;
}
function clamp(v, min,max) {
    return Math.min(max, Math.max(min, v));
}
function between(v, min,max) {
    return min <= v && v < max;
}

function side_index(vec) {
    if (vec.x > 0) return Enum.side.east;
    if (vec.y > 0) return Enum.side.south;
    if (vec.x < 0) return Enum.side.west;
    if (vec.y < 0) return Enum.side.north;
}

function all_inner_elements(custom_gate) {
    return [
        ...custom_gate.inner_elements,
        ...custom_gate.inner_elements
            .filter(element => element instanceof CustomGate)
            .flatMap(custom_gate => all_inner_elements(custom_gate))
    ];
}

function rects_overlap(pos_a, size_a, pos_b, size_b) {
    return Math.min(pos_a.x, pos_a.x+size_a.x) <= Math.max(pos_b.x, pos_b.x+size_b.x)
        && Math.max(pos_a.x, pos_a.x+size_a.x) >= Math.min(pos_b.x, pos_b.x+size_b.x)
        && Math.min(pos_a.y, pos_a.y+size_a.y) <= Math.max(pos_b.y, pos_b.y+size_b.y)
        && Math.max(pos_a.y, pos_a.y+size_a.y) >= Math.min(pos_b.y, pos_b.y+size_b.y);
}

function download_string(text, file_name) {
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
}

function bounding_rect(elements) {
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
}

function replace_reference(element, reference, new_reference) {
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
}

function deep_copy(element) {
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
}

function extended_stringify(value, replacer=null, space=null) {
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
    }(deep_copy(value)), replacer, space);
}

function extended_parse(value, reviver=null) {
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
}
