'use strict';

const Settings = {
    is_open: true,
    currently_edited_setting: null,

    reset: function() {
        cs.config = Util.deep_copy(default_config);
        Settings.update_config();
        Settings.update();
    },
    update_config: function() {
        function update_config_using(setting, converter) {
            const value = converter(Util.get_nested(cs.config, setting));
            Util.set_nested(cs.config, setting, value);
        }

        function update_config_float(setting) {
            return update_config_using(setting, parseFloat);
        }
        function update_config_boolean(setting) {
            return update_config_using(setting, value => value=='on' ? true : value=='off' ? false : !!value);
        }

        select_theme(cs.config.theme);

        update_config_float('default_grid_size');
        update_config_float('ticks_per_frame');
        update_config_float('scale_factor');
        update_config_float('anim_factor');
        update_config_float('camera_anim_factor');
        update_config_float('camera_motion_anim_factor');
        update_config_float('default_color_anim_factor');
        update_config_float('fade_color_anim_factor');
        update_config_float('fast_color_anim_factor');
        update_config_float('camera_motion_falloff_factor');
        update_config_float('label_anim_factor');
        update_config_float('label_caret_width');
        update_config_float('label_caret_smoothness');
        update_config_float('label_caret_blink_rate');
        update_config_float('default_rising_edge_pulse_length');

        update_config_boolean('show_ui');
        update_config_boolean('block_unused_key_combinations');
        update_config_boolean('use_system_clipboard');
        update_config_boolean('use_wire_restructuring');
        update_config_boolean('gates_push_wires');
        update_config_boolean('prevent_element_overlapping');
    },

    update: function() {
        for (const settings of document.querySelectorAll('.setting')) {
            const input = settings.querySelector('input, select');

            if (input.type == 'select-one' || input.type == 'text') {
                input.value = Util.get_nested(cs.config, settings.getAttribute('setting'));
            }
            if (input.type == 'checkbox') {
                input.checked = Util.get_nested(cs.config, settings.getAttribute('setting'));
            }
        }
    },

    load: function() {
        Settings.add_event_listeners();
        Settings.hide();
    },

    show: function() {
        Settings.is_open = true;
        Settings.update();
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
            if (event.key == 'Escape' || event.key == 'Enter') {
                Settings.set_recording_element(null);
                document.activeElement.blur();

                Util.set_nested(cs.config, Settings.currently_edited_setting, Settings.currently_edited_setting_previous_value);
                Settings.update_config();
                Settings.currently_edited_setting = null;

                Settings.update();
                return false;
            }

            return;
        }

        return true;
    },

    edit_keybind: function(event) {
        console.log('EDIT KEYBIND');

        let modifier_string = '';

        if (event.ctrlKey)  modifier_string += 'Ctrl+';
        if (event.shiftKey) modifier_string += 'Shift+';
        if (event.altKey)   modifier_string += 'Alt+';

        console.log(event);

        this.value = `${modifier_string}${event.key}`;

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

    show_invalid_input_tooltip: function(beneath_element, text) {
        const tooltip = document.querySelector('#invalid-input-tooltip');

        const bounds = beneath_element.getBoundingClientRect();

        tooltip.style.top = bounds.bottom;
        tooltip.style.left = bounds.left;

        tooltip.innerText = text;

        tooltip.style.display = 'initial';
    },
    hide_tooltip: function() {
        const tooltip = document.querySelector('#invalid-input-tooltip');

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
                linked_element.scrollIntoView();
            });
        }

        const searchbar = document.querySelector('.searchbar');

        searchbar.addEventListener('input', function(event) {
            Settings.filter_settings(searchbar.value);
        });

        for (const element of document.querySelectorAll('.keybind')) {
            const input = element.querySelector('input');

            const buttons = element.querySelector('.buttons');
            const record = buttons.querySelector('.record');
            const next = buttons.querySelector('.next');

            record.addEventListener('click', function(event) {
                input.focus();
                Settings.set_recording_element(input);
            });

            input.addEventListener('blur', function(event) {
                Settings.set_recording_element(null);
            });
        }

        for (const element of document.querySelectorAll('.setting')) {
            const input_element = element.querySelector('input, select');
            const setting = element.getAttribute('setting');

            input_element.addEventListener('focus', function(event) {
                Settings.currently_edited_setting_previous_value = Util.get_nested(cs.config, setting);
                Settings.currently_edited_setting = setting;
            });
            input_element.addEventListener('blur', function(event) {
                Settings.currently_edited_setting = null;
            });
            input_element.addEventListener('change', function(event) {
                Util.set_nested(cs.config, setting, this.value || this.checked);
                Settings.update_config();
                Settings.update();
            });
        }
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
