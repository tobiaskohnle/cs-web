'use strict';

const Settings = {
    is_open: false,
    currently_edited_setting: null,

    reset_all() {
        localStorage.clear();
        cs.sidebar.load_categories();
        Settings.reset();
    },
    reset() {
        cs.config = Util.deep_copy(default_config);
        Menu.select_theme(cs.config.theme);
        Settings.import_all_settings();
        Settings.clear_filter();
    },
    reset_current_setting() {
        const setting = Settings.currently_edited_setting;

        if (setting) {
            Util.set_nested(cs.config, setting, Util.get_nested(default_config, setting));
            Settings.import_setting(setting);
            Settings.export_setting(setting);
        }
    },
    record_current_keybind() {
        const setting = Settings.currently_edited_setting;

        if (setting) {
            const input = document.querySelector(`.settings-container [setting='${setting}'] input`);

            input.focus();
            Settings.set_recording_element(input);
        }
    },

    import_all_settings(config=cs.config, key_prefix='') {
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
    import_setting(setting) {
        const setting_element = document.querySelector(`.settings-container [setting='${setting}']`);
        if (setting_element) {
            const input = setting_element.querySelector('input, select');
            let value = Util.get_nested(cs.config, setting);

            switch (setting_element.getAttribute('type')) {
                case 'theme':
                case 'select':
                    input.value = value;
                    break;

                case 'checkbox':
                    input.checked = value;
                    break;

                case 'slider':
                    switch (setting) {
                        case 'ticks_per_frame':
                            input.value = Util.map(value, 1, 201, 0, 1);
                            break;

                        case 'scale_factor':
                            input.value = Util.map(value, 1, 1.4, 0, 1);
                            break;

                        default:
                            input.value = value;
                            break;
                    }

                    input.dispatchEvent(new Event('input'));
                    break;

                case 'keybind':
                    input.value = Keybind.parse(value).to_string();
                    break;
            }
        }
    },
    export_setting(setting) {
        const setting_element = document.querySelector(`.settings-container [setting='${setting}']`);
        const input = setting_element.querySelector('input, select');

        let value;

        switch (setting_element.getAttribute('type')) {
            case 'theme':
                value = input.value;
                Menu.select_theme(value);
                break;

            case 'select':
                value = input.value;
                break;

            case 'checkbox':
                value = input.checked;
                break;

            case 'slider':
                value = input.valueAsNumber;

                switch (setting) {
                    case 'ticks_per_frame':
                        value = Util.map(value, 0, 1, 1, 201)|0;
                        break;

                    case 'scale_factor':
                        value = Util.map(value, 0, 1, 1, 1.4);
                        break;
                }
                break;

            case 'keybind':
                value = Keybind.parse(input.value).to_string();
                break;
        }

        Util.set_nested(cs.config, setting, value);
    },

    clear_filter() {
        document.querySelector('.searchbar').value = '';
        Settings.filter_settings('');
    },

    load() {
        Settings.add_event_listeners();
    },

    show() {
        Menu.close();

        Settings.is_open = true;
        const settings_container = document.querySelector('.settings-backdrop');
        settings_container.style.display = '';

        Settings.import_all_settings();
    },
    hide() {
        Settings.is_open = false;
        Settings.hide_tooltip();
        const settings_container = document.querySelector('.settings-backdrop');
        settings_container.style.display = 'none';
    },

    key_down(event) {
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

    edit_keybind(event) {
        if (event.key != 'Escape' && event.key != 'Enter') {
            this.value = Keybind.from_event(event).to_string();
        }

        event.preventDefault();
        return false;
    },

    recording_element: null,
    set_recording_element(element) {
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

    show_tooltip(beneath_element, text) {
        const tooltip = document.querySelector('#tooltip');

        const bounds = beneath_element.getBoundingClientRect();

        tooltip.style.top = `${bounds.bottom}px`;
        tooltip.style.left = `${bounds.left}px`;

        tooltip.innerText = text;

        tooltip.style.display = 'unset';
    },
    hide_tooltip() {
        const tooltip = document.querySelector('#tooltip');

        tooltip.style.display = 'none';
    },

    add_event_listeners() {
        const settings_container = document.querySelector('.settings-backdrop');

        settings_container.addEventListener('click', function(event) {
            if (event.target == settings_container) {
                Settings.hide();
            }
        });

        for (const element of document.querySelectorAll('.link[link]')) {
            const linked_element = document.querySelector(element.getAttribute('link'));

            element.addEventListener('click', function(event) {
                Settings.clear_filter();
                linked_element.scrollIntoView({behavior: 'smooth'});
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
            input_element.addEventListener('change', function(event) {
                Settings.export_setting(setting);
            });
            input_element.addEventListener('blur', function(event) {
                Settings.export_setting(setting);

                Settings.set_recording_element(null);
                Settings.currently_edited_setting = null;
            });

            if (input_element.type == 'range') {
                input_element.setAttribute('min', '0');
                input_element.setAttribute('max', '1');
                input_element.setAttribute('step', '1e-4');

                input_element.addEventListener('input', function(event) {
                    input_element.style.background = `linear-gradient(
                        to right,
                        var(--setting-slider-background-left) 0%,
                        var(--setting-slider-background-left) ${this.valueAsNumber*100}%,
                        var(--setting-slider-background-right) ${this.valueAsNumber*100}%,
                        var(--setting-slider-background-right) 100%
                    )`;

                    const slider_label = element.querySelector('.slider-thumb-label');

                    slider_label.style.left = `${Util.map(this.valueAsNumber, 0, 1, 9/2, this.clientWidth-9/2)}px`;

                    let labels;

                    switch (setting) {
                        case 'ticks_per_frame':
                            labels = [
                                {value: 0, text: 'slow'},
                                {value: .5, text: 'fast'},
                                {value: .999, text: 'very fast'},
                                {value: 1, text: 'melting cpu'},
                            ];
                            break;

                        case 'scale_factor':
                            labels = [
                                {value: 0, text: 'slow'},
                                {value: .5, text: 'default'},
                                {value: 1, text: 'fast'},
                            ];
                            break;

                        case 'anim_factor':
                        case 'camera_anim_factor':
                            labels = [
                                {value: 0, text: 'snail'},
                                {value: .2, text: 'smooth'},
                                {value: .3, text: 'slow'},
                                {value: .5, text: 'default'},
                                {value: .7, text: 'fast'},
                                {value: 1,  text: 'instant'},
                            ];
                            break;
                    }

                    const compare_value = Util.compare_function(label => Math.abs(label.value-this.valueAsNumber));
                    slider_label.innerText = labels.sorted(compare_value)[0].text;
                });
            }
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

        const reset_all_button = document.querySelector('.sidebar-item#reset_all');
        reset_all_button.addEventListener('click', function(event) {
            if (reset_all_button.hasAttribute('active')) {
                Settings.reset_all();
            }
        });

        const reset_button = document.querySelector('.sidebar-item#reset');
        reset_button.addEventListener('click', function(event) {
            if (reset_button.hasAttribute('active')) {
                Settings.reset();
            }
        });

        const reset_buttons = document.querySelectorAll('.sidebar-item.reset');
        reset_buttons.forEach(button => button.addEventListener('click', function(event) {
            button.toggleAttribute('active');
        }));
        reset_buttons.forEach(button => button.addEventListener('blur', function(event) {
            button.removeAttribute('active');
        }));
        reset_buttons.forEach(button => button.addEventListener('mouseleave', function(event) {
            if (button.hasAttribute('active')) {
                Settings.show_tooltip(button, 'Click again to confirm');
            }
        }));
    },

    match_search_pattern(pattern, text) {
        if (!pattern) {
            return true;
        }

        const text_words = text.split(/\s+/);

        for (const word of pattern.split(/\s+/)) {
            const match_fuzzy_regex = new RegExp(
                word
                .split('')
                .map(char => /[\$\(\)\*\+\.\/\?\[\\\]\^{\|}]/.test(char) ? `\\${char}` : char)
                .join('.*'),
                'i',
            );

            if (text_words.find(text_word => match_fuzzy_regex.test(text_word))) {
                continue;
            }

            return false;
        }

        return true;
    },

    filter_settings(pattern) {
        for (const element of document.querySelectorAll('.setting-header')) {
            element.style.display = pattern ? 'none' : '';
        }

        for (const element of document.querySelectorAll('.setting')) {
            const visible = Settings.match_search_pattern(pattern, element.innerText);
            element.style.display = visible ? '' : 'none';
        }
    },
};
