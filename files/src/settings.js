'use strict';

const Settings = {
    is_open: true,

    load: function() {
        Settings.add_event_listeners();
        Settings.hide();
    },

    show: function() {
        Settings.is_open = true;
        const settings_container = document.querySelector('.settings-container');
        settings_container.style.display = '';
    },
    hide: function() {
        Settings.is_open = false;
        Settings.hide_tooltip();
        const settings_container = document.querySelector('.settings-container');
        settings_container.style.display = 'none';
    },

    edit_keybind: function(event) {
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

        for (const element of document.querySelectorAll('input')) {
            element.addEventListener('keydown', function(event) {
                if (event.key == 'Escape' || event.key == 'Enter') {
                    Settings.set_recording_element(null);
                    document.activeElement.blur();
                }
            });
        }
    },

    match_pattern: function(pattern, text) {
        return new RegExp(pattern.split('').join('.*'), 'i').test(text);
    },

    filter_settings: function(pattern) {
        for (const element of document.querySelectorAll('.setting-header')) {
            element.style.display = pattern ? 'none' : '';
        }

        for (const element of document.querySelectorAll('.setting')) {
            const visible = Settings.match_pattern(pattern, element.innerText);
            element.style.display = visible ? '' : 'none';
        }
    },
};
