'use strict';

function update_menu() {
    for (const menu_element of document.querySelectorAll('.menu')) {
        const menu_items = menu_element.querySelectorAll('.menu-item');

        for (const menu_item of menu_items) {
            menu_item.style.gridTemplateColumns = `22px min-content 10px min-content 10px`;

            update_shortcut_string(menu_item);
        }

        let text_column_width = 0;
        let shortcut_column_width = 0;

        for (const menu_item of menu_items) {
            const text_span = menu_item.querySelector('span:nth-child(1)');
            const shortcut_span = menu_item.querySelector('span:nth-child(2)');

            text_column_width = Math.max(text_column_width, text_span.clientWidth);
            if (shortcut_span) {
                shortcut_column_width = Math.max(shortcut_column_width, shortcut_span.clientWidth);
            }
        }

        for (const menu_item of menu_items) {
            menu_item.style.gridTemplateColumns = `22px ${text_column_width}px 10px ${shortcut_column_width}px 10px`;
        }
    }
}

function update_shortcut_string(menu_item) {
    const command_name = menu_item.getAttribute('command');

    if (command_name) {
        const command = commands.find(command => command.name == command_name);

        if (command) {
            if (command.shortcuts.length) {
                while (menu_item.childElementCount < 2) {
                    const span = document.createElement('span');
                    menu_item.appendChild(span);
                }

                menu_item.children[1].innerText = command.shortcuts[0].to_string();
            }
            else {
                while (menu_item.childElementCount >= 2) {
                    menu_item.removeChild(menu_item.lastChild);
                }
            }

            menu_item.onclick = command.command;
        }
        else {
        }
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

        menu_button.onmousedown = function() {
            open_menu_function(menu, menu_button);
        }
    }

    for (const menu_button of document.querySelectorAll('.menu-item:not([menu])')) {
        menu_button.addEventListener('click', close_menu);
    }
}

function open_menu_under(menu, element) {
    const rect = element.getBoundingClientRect();
    open_menu(menu, rect.left, rect.bottom);
}
function open_menu_next_to(menu, element) {
    const rect = element.getBoundingClientRect();
    open_menu(menu, rect.right-3, rect.top-3);
}
function open_menu(menu, x, y) {
    const menu_element = document.querySelector(`.menu[menu=${menu}]`);

    const parent_button = document.querySelector(`.menu :not(.menu)[menu=${menu}]`);
    const parent_element = parent_button ? parent_button.parentElement : null;

    let menu_is_enabled = false;

    while (current_tab.controller.open_menu_stack.length) {
        if (current_tab.controller.open_menu_stack.last() == menu_element) {
            menu_is_enabled = true;
        }

        if (current_tab.controller.open_menu_stack.last() == parent_element) {
            break;
        }

        set_menu_element_enabled(current_tab.controller.open_menu_stack.last(), false);
        current_tab.controller.open_menu_stack.pop();
    }

    set_menu_element_enabled(menu_element, !menu_is_enabled, x, y);
    if (!menu_is_enabled) {
        current_tab.controller.open_menu_stack.push(menu_element);
    }
    else {
        current_tab.controller.open_menu_stack.remove(menu_element);
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
function close_menu() {
    for (const menu_element of current_tab.controller.open_menu_stack) {
        set_menu_element_enabled(menu_element, false);
    }

    current_tab.controller.open_menu_stack = [];
}

function menu_click(path) {
    for (const class_name of ['menu', 'menubar-item', 'menu-item', 'menu-separator']) {
        for (const element of path) {
            if (element.classList && element.classList.contains(class_name)) {
                return;
            }
        }
    }

    close_menu();
}
