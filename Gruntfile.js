module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        concat: {
            dist: {
                src: [
                    'files/src/util.js',
                    'files/src/element.js',
                    'files/src/actions.js',
                    'files/src/camera.js',
                    'files/src/color.js',
                    'files/src/commands.js',
                    'files/src/controller.js',
                    'files/src/gate.js',
                    'files/src/label.js',
                    'files/src/main.js',
                    'files/src/menu.js',
                    'files/src/node.js',
                    'files/src/sidebar.js',
                    'files/src/vec.js',
                    'files/src/view.js',
                    'files/src/wire.js',
                    'files/src/settings.js',
                ],
                dest: 'build/cs-concat.js',
            },
        },
        babel: {
            options: {
                presets: ['@babel/preset-env']
            },
            dist: {
                files: {
                    'dist/cs.js': 'build/cs-concat.js'
                }
            }
        },
        copy: {
            html: {
                files: [
                    { src: 'index-dist.html', dest: 'dist/index.html' }
                ]
            },
            css: {
                files: [
                    { src: 'files/css/*.css', dest: 'dist/files/css/' }
                ]
            },
            icon: {
                files: [
                    { src: 'files/icon/favicon.png', dest: 'dist/' }
                ]
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('default', ['concat', 'babel', 'copy']);
};

