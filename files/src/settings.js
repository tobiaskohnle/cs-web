'use strict';

const Settings = {
    is_open: true,
    currently_edited_setting: null,

    reset: function() {
        cs.config = Util.deep_copy(default_config);
        Settings.import_all_settings();
        Settings.clear_filter();
    },
    reset_current_setting: function() {
        const setting = Settings.currently_edited_setting;

        if (setting) {
            Util.set_nested(cs.config, setting, Util.get_nested(default_config, setting));
            Settings.import_setting(setting);
            Settings.export_setting(setting);
        }
    },
    record_current_keybind: function() {
        const setting = Settings.currently_edited_setting;

        if (setting) {
            const input = document.querySelector(`.settings-container [setting='${setting}'] input`);

            input.focus();
            Settings.set_recording_element(input);
        }
    },

    import_all_settings: function(config=cs.config, key_prefix='') {
        for (const key in config) {
            const value = config[key];

            if (value instanceof Object) {
                Settings.import_all_settings(value, `${key_prefix}${key}.`);
            }
            else {
                Settings.import_setting(`${key_prefix}${key}`);
            }
        }
    },
    import_setting: function(setting) {
        const setting_element = document.querySelector(`.settings-container [setting='${setting}']`);
        if (setting_element) {
            const input = setting_element.querySelector('input, select');
            const value = Util.get_nested(cs.config, setting);

            if (input.type == 'select-one' || input.type == 'text') {
                input.value = value;
            }
            if (input.type == 'checkbox') {
                input.checked = value;
            }
        }
    },
    export_setting: function(setting) {
        const setting_element = document.querySelector(`.settings-container [setting='${setting}']`);
        const input = setting_element.querySelector('input, select');

        let value;
        if (input.type == 'select-one' || input.type == 'text') {
            value = input.value;
        }
        if (input.type == 'checkbox') {
            value = input.checked;
        }

        switch (setting_element.getAttribute('type')) {
            case 'theme':
                Menu.select_theme(value);
                break;

            case 'float':
                value = parseFloat(value);
                break;

            case 'keybind':
                value = Keybind.parse(value).to_string();
                break;
        }

        Util.set_nested(cs.config, setting, value);
    },

    clear_filter: function() {
        document.querySelector('.searchbar').value = '';
        Settings.filter_settings('');
    },

    load: function() {
        Settings.add_event_listeners();
        Settings.hide();
    },

    show: function() {
        Settings.is_open = true;
        Settings.import_all_settings();
        const settings_container = document.querySelector('.settings-container');
        settings_container.style.display = '';
    },
    hide: function() {
        Settings.is_open = false;
        Settings.hide_tooltip();
        const settings_container = document.querySelector('.settings-container');
        settings_container.style.display = 'none';
    },

    key_down: function(event) {
        if (Settings.currently_edited_setting) {
            if (event.key == 'Escape') {
                Util.set_nested(cs.config, Settings.currently_edited_setting, Settings.currently_edited_setting_previous_value);
                Settings.export_setting(Settings.currently_edited_setting);

                Settings.set_recording_element(null);
                document.activeElement.blur();
                Settings.currently_edited_setting = null;

                return false;
            }

            if (event.key == 'Enter') {
                Settings.export_setting(Settings.currently_edited_setting);

                Settings.set_recording_element(null);
                document.activeElement.blur();
                Settings.currently_edited_setting = null;

                return false;
            }
        }

        if (event.key == 'Escape') {
            const searchbar = document.querySelector('.searchbar');

            if (searchbar.value) {
                Settings.clear_filter();
            }
            else {
                Settings.hide();
            }

            return false;
        }

        return true;
    },

    edit_keybind: function(event) {
        if (event.key != 'Escape' && event.key != 'Enter') {
            let modifier_string = '';

            if (event.ctrlKey)  modifier_string += 'Ctrl+';
            if (event.shiftKey) modifier_string += 'Shift+';
            if (event.altKey)   modifier_string += 'Alt+';

            this.value = `${modifier_string}${event.key}`;
        }

        event.preventDefault();
        return false;
    },

    recording_element: null,
    set_recording_element: function(element) {
        if (Settings.recording_element) {
            Settings.recording_element.classList.remove('recording');
            Settings.recording_element.removeEventListener('keydown', Settings.edit_keybind);
        }

        Settings.recording_element = element;

        if (Settings.recording_element) {
            element.classList.add('recording');
            Settings.recording_element.addEventListener('keydown', Settings.edit_keybind);
        }
    },

    show_tooltip: function(beneath_element, text) {
        const tooltip = document.querySelector('#tooltip');

        const bounds = beneath_element.getBoundingClientRect();

        tooltip.style.top = `${bounds.bottom}px`;
        tooltip.style.left = `${bounds.left}px`;

        tooltip.innerText = text;

        tooltip.style.display = 'unset';
    },
    hide_tooltip: function() {
        const tooltip = document.querySelector('#tooltip');

        tooltip.style.display = 'none';
    },

    add_event_listeners: function() {
        const settings_container = document.querySelector('.settings-container');

        settings_container.addEventListener('click', function(event) {
            if (event.target == settings_container) {
                Settings.hide();
            }
        });

        for (const element of document.querySelectorAll('.link[link]')) {
            const linked_element = document.querySelector(element.getAttribute('link'));

            element.addEventListener('click', function(event) {
                Settings.clear_filter();
                linked_element.scrollIntoView();
            });
        }

        const searchbar = document.querySelector('.searchbar');

        searchbar.addEventListener('input', function(event) {
            Settings.filter_settings(searchbar.value);
        });

        for (const element of document.querySelectorAll('.setting')) {
            const input_element = element.querySelector('input, select');
            const setting = element.getAttribute('setting');

            input_element.addEventListener('focus', function(event) {
                Settings.currently_edited_setting_previous_value = Util.get_nested(cs.config, setting);
                Settings.currently_edited_setting = setting;
            });
            input_element.addEventListener('blur', function(event) {
                if (Settings.currently_edited_setting) {
                    Settings.export_setting(Settings.currently_edited_setting);

                    Settings.set_recording_element(null);
                    Settings.currently_edited_setting = null;
                }
            });
        }

        for (const element of document.querySelectorAll('.setting-dropdown')) {
            const setting_element = element.parentElement.parentElement;
            const setting = setting_element.getAttribute('setting');
            const type = setting_element.getAttribute('type');

            const menu_setting = type=='keybind' ? 'setting-menu-keybind' : 'setting-menu';

            element.addEventListener('click', function(event) {
                Menu.open_next_to(menu_setting, this);
                Settings.currently_edited_setting = setting;
            });
        }

        const reset_button = document.querySelector('.sidebar-item#reset');
        reset_button.addEventListener('click', function(event) {
            if (reset_button.hasAttribute('active')) {
                Settings.reset();
                Menu.select_theme(cs.config.theme);

                reset_button.removeAttribute('active');
            }
            else {
                reset_button.setAttribute('active', '');
            }
        });
        reset_button.addEventListener('blur', function(event) {
            reset_button.removeAttribute('active');
        });
        reset_button.addEventListener('mouseleave', function(event) {
            if (reset_button.hasAttribute('active')) {
                Settings.show_tooltip(reset_button, 'Click again to confirm');
            }
        });
    },

    match_fuzzy: function(pattern, text) {
        return new RegExp(pattern.split('').join('.*'), 'i').test(text);
    },

    filter_settings: function(pattern) {
        for (const element of document.querySelectorAll('.setting-header')) {
            element.style.display = pattern ? 'none' : '';
        }

        for (const element of document.querySelectorAll('.setting')) {
            const visible = Settings.match_fuzzy(pattern, element.innerText);
            element.style.display = visible ? '' : 'none';
        }
    },
};
