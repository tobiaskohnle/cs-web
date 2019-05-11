'use strict';

Array.prototype.last = function() {
    return this[this.length - 1];
}
Array.prototype.remove = function(element) {
    const index = this.indexOf(element);

    if (index >= 0) {
        this.splice(index, 1);
    }
}

function mod(a, n) {
    return a - n * Math.floor(a / n);
}
function map(d, s0,s1, d0,d1) {
    return (d0-d1) / (s0-s1) * (d-s0) + d0;
}

function get_all_inner_gates(custom_gate) {
    return [
        ...custom_gate.inner_gates,
        ...custom_gate.inner_gates
            .filter(element => element instanceof CustomGate)
            .flatMap(custom_gate => get_all_inner_gates(custom_gate))
    ];
}

function string_to_type(string) {
    switch (string) {
        case 'cs:and_gate':        return AndGate        .prototype;
        case 'cs:custom_gate':     return CustomGate     .prototype;
        case 'cs:input_node':      return InputNode      .prototype;
        case 'cs:input_switch':    return InputSwitch    .prototype;
        case 'cs:nop_gate':        return NopGate        .prototype;
        case 'cs:or_gate':         return OrGate         .prototype;
        case 'cs:output_light':    return OutputLight    .prototype;
        case 'cs:output_node':     return OutputNode     .prototype;
        // case 'cs:segment_display': return SegmentDisplay .prototype;
        case 'cs:vector':          return Vec            .prototype;
    }
}
function type_to_string(prototype) {
    if (prototype instanceof AndGate)        return 'cs:and_gate';
    if (prototype instanceof CustomGate)     return 'cs:custom_gate';
    if (prototype instanceof InputNode)      return 'cs:input_node';
    if (prototype instanceof InputSwitch)    return 'cs:input_switch';
    if (prototype instanceof NopGate)        return 'cs:nop_gate';
    if (prototype instanceof OrGate)         return 'cs:or_gate';
    if (prototype instanceof OutputLight)    return 'cs:output_light';
    if (prototype instanceof OutputNode)     return 'cs:output_node';
    // if (prototype instanceof SegmentDisplay) return 'cs:segment_display';
    if (prototype instanceof Vec)            return 'cs:vector';
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

function remove_loose_connections(elements) {
    for (const element of elements) {
        if (element instanceof Gate) {
            for (const input of element.inputs) {
                if (!elements.includes(input.previous_node())) {
                    input.clear();
                }
            }

            for (const output of element.outputs) {
                output.next_nodes = output.next_nodes.filter(next_node => elements.includes(next_node));
            }
        }
    }
}

function get_bounding_rect(elements) {
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

function deep_copy(element) {
    const references = [];
    const cached_results = [];

    return (function copy(element) {
        if (!element || typeof element !== 'object') {
            return element;
        }

        const index = references.indexOf(element);
        if (index >= 0) {
            return cached_results[index];
        }

        references.push(element);

        // const result = Array.isArray(element) ? []
        //     : !element ? element
        //     : element.constructor ? new element.constructor()
        //     : {};
        const result = new element.constructor();

        cached_results.push(result);

        for (const key in element) {
            if (element.hasOwnProperty(key)) {
                result[key] = copy(element[key]);
            }
        }

        return result;
    })(element);
}

/// {'@ref': 4}: reference to element with id 4
/// {'@id': 1, ...}: element with id 1
/// {'@type': 'Vec', ...}: 'Vec' is the prototype of this element
function prepare_for_stringify(value) {
    const references = [];

    return (function prepare(value) {
        const index = references.indexOf(value);

        if (index >= 0) {
            return {['@ref']: index};
        }
        else if (value instanceof Object) {
            value['@id'] = references.length;
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

            // const constructor_name = value.constructor.name;

            if (!['Object', 'Array', 'String', 'Number'].includes(/*constructor_name*/value.constructor.name)) {
                value['@type'] = type_to_string(value);
            }
        }

        return value;
    })(value);
}

function edit_after_parse(value) {
    const references = [];

    return (function edit(value) {
        if (value != undefined) {
            if (value.hasOwnProperty('@ref')) {
                const return_value = references[value['@ref']];
                delete value['@ref'];
                return return_value;
            }
            else if (value.hasOwnProperty('@id')) {
                references[value['@id']] = value;
                delete value['@id'];
            }
        }

        if (value instanceof Array) {
            return value.map(element => edit(element));
        }
        else if (value instanceof Object) {
            let constructor_name;

            for (const key in value) {
                if (key == '@type') {
                    constructor_name = value[key];
                    delete value[key];
                    continue;
                }

                value[key] = edit(value[key]);
            }

            if (constructor_name) {
                Object.setPrototypeOf(value, string_to_type(constructor_name));
            }
        }

        return value;
    })(value);
}