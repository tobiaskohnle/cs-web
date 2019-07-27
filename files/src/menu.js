'use strict';

const Menu = {
    open_menu_stack: [],
    sidebar_open: true,

    update: function() {
        for (const menu_element of document.querySelectorAll('.menu')) {
            const menu_items = menu_element.querySelectorAll('.menu-item');

            for (const menu_item of menu_items) {
                menu_item.style.gridTemplateColumns = '22px min-content 10px min-content 10px';

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

                    if (is_command_enabled(command_name)) {
                        menu_item.classList.remove('disabled');
                    }
                    else {
                        menu_item.classList.add('disabled');
                    }
                }
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
    },

    add_event_listeners: function() {
        for (const menu_element of document.querySelectorAll('.menu')) {
            const menu = menu_element.getAttribute('menu');
            const menu_button = document.querySelector(`:not(.menu)[menu=${menu}]`);

            if (!menu_button) {
                continue;
            }

            const open_menu_function = menu_button.classList.contains('menu-item')
                ? Menu.open_next_to
                : Menu.open_under;

            menu_button.addEventListener('mousedown', function(event) {
                open_menu_function(menu, menu_button);
            });
        }

        for (const menu_button of document.querySelectorAll('.menu-item:not([menu])')) {
            menu_button.addEventListener('click', Menu.close);
        }

        for (const menu_button of document.querySelectorAll('.menubar-item')) {
            const menu = menu_button.getAttribute('menu');

            menu_button.addEventListener('mouseenter', function(event) {
                if (Menu.open_menu_stack.length) {
                    Menu.open_under(menu, menu_button, false);
                }
            });
        }

        let timeout_id;

        for (const menu_button of document.querySelectorAll('.menu-item')) {
            const menu = menu_button.getAttribute('menu');

            menu_button.addEventListener('mouseenter', function(event) {
                timeout_id = setTimeout(function() {
                    if (menu) {
                        Menu.open_next_to(menu, menu_button, false);
                    }
                    else {
                        Menu.close_from(menu_button);
                    }
                }, 350);
            });
            menu_button.addEventListener('mouseleave', function(event) {
                clearTimeout(timeout_id);
            });
        }
    },

    open_under: function(menu, element, toggle_menu=true) {
        const rect = element.getBoundingClientRect();
        Menu.open(menu, rect.left, rect.bottom, toggle_menu);
    },
    open_next_to: function(menu, element, toggle_menu=true) {
        const rect = element.getBoundingClientRect();
        Menu.open(menu, rect.right-3, rect.top-3, toggle_menu);
    },
    open: function(menu, x, y, toggle_menu=true) {
        const menu_element = document.querySelector(`.menu[menu=${menu}]`);

        const parent_button = document.querySelector(`.menu :not(.menu)[menu=${menu}]`);
        const parent_element = parent_button ? parent_button.parentElement : null;

        let menu_is_enabled = false;

        while (Menu.open_menu_stack.length) {
            if (Menu.open_menu_stack.last() == menu_element) {
                menu_is_enabled = true;
            }

            if (Menu.open_menu_stack.last() == parent_element) {
                break;
            }

            Menu.set_element_enabled(Menu.open_menu_stack.last(), false);
            Menu.open_menu_stack.pop();
        }

        const is_enabled = !toggle_menu || !menu_is_enabled;

        Menu.set_element_enabled(menu_element, is_enabled, x, y);

        if (is_enabled) {
            Menu.open_menu_stack.push(menu_element);
        }
        else {
            Menu.open_menu_stack.remove(menu_element);
        }
    },

    move_on_screen: function(menu_element, menu_button=null) {
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
    },

    set_element_enabled: function(menu_element, enabled, x, y) {
        const menu = menu_element.getAttribute('menu');
        const menu_button = document.querySelector(`:not(.menu)[menu=${menu}]`);

        if (enabled) {
            menu_element.style.display = 'block';
            menu_element.style.left = `${x}px`;
            menu_element.style.top = `${y}px`;

            if (menu_button) {
                menu_button.classList.add('active');
            }

            Menu.update();
            Menu.move_on_screen(menu_element, menu_button);
        }
        else {
            menu_element.style.display = 'none';

            if (menu_button) {
                menu_button.classList.remove('active');
            }
        }
    },

    click: function(path) {
        for (const class_name of ['menu', 'menubar-item', 'menu-item', 'menu-separator']) {
            for (const element of path) {
                if (element.classList && element.classList.contains(class_name)) {
                    return;
                }
            }
        }

        Menu.close();
    },

    close: function() {
        for (const menu_element of Menu.open_menu_stack) {
            Menu.set_element_enabled(menu_element, false);
        }

        Menu.open_menu_stack = [];
    },
    close_from: function(menu_button) {
        for (const menu_element of Menu.open_menu_stack.copy().reverse()) {
            if (Array.from(menu_element.childNodes).includes(menu_button)) {
                break;
            }

            Menu.set_element_enabled(menu_element, false);
        }
    },

    select_theme: function(theme_name) {
        cs.theme = theme[theme_name];
        document.querySelector('#theme-style').href = `files/css/style-${theme_name}.css`;
        document.querySelector('#theme-settings-style').href = `files/css/settings-${theme_name}.css`;
        if (cs.sidebar) {
            cs.sidebar.update_elements();
        }
    },

    show_sidebar: function(is_visible) {
        Menu.sidebar_open = is_visible;

        document.querySelector('.window').style.gridTemplateColumns=`${is_visible ? '250px' : '0'} auto`;
        onresize();
    },
};
