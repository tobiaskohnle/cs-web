'use strict';

function update_menu() {
    for (const menu_element of document.querySelectorAll('.menu')) {
        const menu_items = menu_element.querySelectorAll('.menu-item');

        for (const menu_item of menu_items) {
            menu_item.style.gridTemplateColumns = '22px min-content 10px min-content 10px';

            update_keybind_string(menu_item);
        }

        let text_column_width = 0;
        let keybind_column_width = 0;

        for (const menu_item of menu_items) {
            const text_span = menu_item.querySelector('span:nth-child(1)');
            const keybind_span = menu_item.querySelector('span:nth-child(2)');

            text_column_width = Math.max(text_column_width, text_span.clientWidth);
            if (keybind_span) {
                keybind_column_width = Math.max(keybind_column_width, keybind_span.clientWidth);
            }
        }

        for (const menu_item of menu_items) {
            menu_item.style.gridTemplateColumns = `22px ${text_column_width}px 10px ${keybind_column_width}px 10px`;
        }
    }
}

function update_keybind_string(menu_item) {
    const command_name = menu_item.getAttribute('command');

    if (command_name) {
        const display_keybind = cs.config.keybinds[command_name];

        if (display_keybind) {
            while (menu_item.childElementCount < 2) {
                const span = document.createElement('span');
                menu_item.appendChild(span);
            }

            menu_item.children[1].innerText = display_keybind;
        }
        else {
            while (menu_item.childElementCount >= 2) {
                menu_item.removeChild(menu_item.lastChild);
            }
        }

        menu_item.addEventListener('click', commands[command_name]);
    }
}

function add_menu_event_listeners() {
    for (const menu_element of document.querySelectorAll('.menu')) {
        const menu = menu_element.getAttribute('menu');
        const menu_button = document.querySelector(`:not(.menu)[menu=${menu}]`);

        if (!menu_button) {
            continue;
        }

        const open_menu_function = menu_button.classList.contains('menu-item')
            ? open_menu_next_to
            : open_menu_under;

        menu_button.addEventListener('mousedown', function(event) {
            open_menu_function(menu, menu_button);
        });
    }

    for (const menu_button of document.querySelectorAll('.menu-item:not([menu])')) {
        menu_button.addEventListener('click', View.close_menu);
    }

    for (const menu_button of document.querySelectorAll('.menubar-item')) {
        const menu = menu_button.getAttribute('menu');

        menu_button.addEventListener('mouseenter', function(event) {
            if (cs.controller.open_menu_stack.length) {
                open_menu_under(menu, menu_button, false);
            }
        });
    }

    let timeout_id;

    for (const menu_button of document.querySelectorAll('.menu-item')) {
        const menu = menu_button.getAttribute('menu');

        menu_button.addEventListener('mouseenter', function(event) {
            timeout_id = setTimeout(function() {
                if (menu) {
                    open_menu_next_to(menu, menu_button, false);
                }
            }, 350);
        });
        menu_button.addEventListener('mouseleave', function(event) {
            clearTimeout(timeout_id);
        });
    }
}

function open_menu_under(menu, element, toggle_menu=true) {
    const rect = element.getBoundingClientRect();
    open_menu(menu, rect.left, rect.bottom, toggle_menu);
}
function open_menu_next_to(menu, element, toggle_menu=true) {
    const rect = element.getBoundingClientRect();
    open_menu(menu, rect.right-3, rect.top-3, toggle_menu);
}
function open_menu(menu, x, y, toggle_menu=true) {
    const menu_element = document.querySelector(`.menu[menu=${menu}]`);

    const parent_button = document.querySelector(`.menu :not(.menu)[menu=${menu}]`);
    const parent_element = parent_button ? parent_button.parentElement : null;

    let menu_is_enabled = false;

    while (cs.controller.open_menu_stack.length) {
        if (cs.controller.open_menu_stack.last() == menu_element) {
            menu_is_enabled = true;
        }

        if (cs.controller.open_menu_stack.last() == parent_element) {
            break;
        }

        set_menu_element_enabled(cs.controller.open_menu_stack.last(), false);
        cs.controller.open_menu_stack.pop();
    }

    const is_enabled = !toggle_menu || !menu_is_enabled;

    set_menu_element_enabled(menu_element, is_enabled, x, y);

    if (is_enabled) {
        cs.controller.open_menu_stack.push(menu_element);
    }
    else {
        cs.controller.open_menu_stack.remove(menu_element);
    }
}

function move_on_screen(menu_element, menu_button=null) {
    if (menu_button == null) {
        if (menu_element.getBoundingClientRect().right > document.body.getBoundingClientRect().right) {
            menu_element.style.left = `${document.body.getBoundingClientRect().right-menu_element.getBoundingClientRect().width}px`;
        }
    }
    else {
        if (menu_element.getBoundingClientRect().right > document.body.getBoundingClientRect().right) {
            menu_element.style.left = `${menu_button.getBoundingClientRect().left-menu_element.getBoundingClientRect().width}px`;
        }
    }

    if (menu_element.getBoundingClientRect().left < document.body.getBoundingClientRect().left) {
        menu_element.style.left = `${document.body.getBoundingClientRect().left}px`;
    }
    if (menu_element.getBoundingClientRect().top < document.body.getBoundingClientRect().top) {
        menu_element.style.top = `${document.body.getBoundingClientRect().top}px`;
    }

    if (menu_element.getBoundingClientRect().bottom > document.body.getBoundingClientRect().bottom) {
        menu_element.style.top = `${menu_element.getBoundingClientRect().top-menu_element.getBoundingClientRect().height}px`;
    }
}

function set_menu_element_enabled(menu_element, enabled, x, y) {
    const menu = menu_element.getAttribute('menu');
    const menu_button = document.querySelector(`:not(.menu)[menu=${menu}]`);

    if (enabled) {
        menu_element.style.display = 'block';
        menu_element.style.left = `${x}px`;
        menu_element.style.top = `${y}px`;

        if (menu_button) {
            menu_button.classList.add('active');
        }

        update_menu();
        move_on_screen(menu_element, menu_button);
    }
    else {
        menu_element.style.display = 'none';

        if (menu_button) {
            menu_button.classList.remove('active');
        }
    }
}

function menu_click(path) {
    for (const class_name of ['menu', 'menubar-item', 'menu-item', 'menu-separator']) {
        for (const element of path) {
            if (element.classList && element.classList.contains(class_name)) {
                return;
            }
        }
    }

    View.close_menu();
}
