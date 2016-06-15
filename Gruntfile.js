module.exports = function (grunt) {
    'use strict';

    require('load-grunt-tasks')(grunt, {
        pattern: ['grunt-*', '!grunt-lib-phantomjs', '!grunt-template-jasmine-istanbul']
    });
    require('time-grunt')(grunt);
    var formatFileList = require('./grunt/format-file-list')(grunt);

    var config = {
        src: 'src',
        scss: 'scss',
        spec: 'spec',
        web: 'web',
        pkg: require('./package.json'),
        banner: grunt.file.read('./LICENSE_BANNER'),
        jsFiles: module.exports.jsFiles
    };

    grunt.initConfig({
        conf: config,
        concat: {
            options: {
                process: true,
                sourceMap: true,
                banner: '<%= conf.banner %>'
            },
            js: {
                src: '<%= conf.jsFiles %>',
                dest: '<%= conf.pkg.npmName %>.js'
            }
        },
        uglify: {
            jsmin: {
                options: {
                    mangle: true,
                    compress: true,
                    sourceMap: true,
                    banner: '<%= conf.banner %>'
                },
                src: '<%= conf.pkg.npmName %>.js',
                dest: '<%= conf.pkg.npmName %>.min.js'
            }
        },
        cssmin: {
            options: {
                shorthandCompacting: false,
                roundingPrecision: -1
            },
            main: {
                files: {
                    'mapdc.min.css': ['mapdc.css'],
                    'chart.min.css': ['chart.css']
                }
            }
        },
        jscs: {
            source: {
                src: [
                    '<%= conf.src %>/**/*.js',
                    '!<%= conf.src %>/{banner,footer}.js',
                    '<%= conf.spec %>/**/*.js',
                    'Gruntfile.js',
                    'grunt/*.js',
                    '<%= conf.web %>/stock.js'],
                options: {
                    config: '.jscsrc'
                }
            }
        },
        jshint: {
            source: {
                src: [
                    '<%= conf.src %>/**/*.js',
                    '!<%= conf.src %>/{banner,footer}.js',
                    '<%= conf.spec %>/**/*.js',
                    'Gruntfile.js',
                    'grunt/*.js',
                    '<%= conf.web %>/stock.js'
                ],
                options: {
                    jshintrc: '.jshintrc'
                }
            }
        },
        watch: {
            jsdoc2md: {
                files: ['<%= conf.src %>/**/*.js'],
                tasks: ['concat', 'uglify']
            },
            sass: {
              files: ['<%= conf.scss %>/**/*.scss'],
              tasks: ['sass']
            }
        },
        connect: {
            server: {
                options: {
                    port: 8888,
                    base: '.'
                }
            }
        },
        jasmine: {
            specs: {
                options: {
                    display: 'short',
                    summary: true,
                    specs:  '<%= conf.spec %>/*-spec.js',
                    helpers: [
                        '<%= conf.spec %>/helpers/*.js',
                        'node_modules/grunt-saucelabs/examples/jasmine/lib/jasmine-jsreporter/jasmine-jsreporter.js'
                    ],
                    version: '2.0.0',
                    outfile: '<%= conf.spec %>/index.html',
                    keepRunner: true
                },
                src: [
                    '<%= conf.web %>/js/d3.js',
                    '<%= conf.web %>/js/crossfilter.js',
                    '<%= conf.web %>/js/colorbrewer.js',
                    '<%= conf.pkg.npmName %>.js'
                ]
            },
            coverage: {
                src: '<%= jasmine.specs.src %>',
                options: {
                    specs: '<%= jasmine.specs.options.specs %>',
                    helpers: '<%= jasmine.specs.options.helpers %>',
                    version: '<%= jasmine.specs.options.version %>',
                    template: require('grunt-template-jasmine-istanbul'),
                    templateOptions: {
                        coverage: 'coverage/jasmine/coverage.json',
                        report: [
                            {
                                type: 'html',
                                options: {
                                    dir: 'coverage/jasmine'
                                }
                            }
                        ]
                    }
                }
            },
            browserify: {
                options: {
                    display: 'short',
                    summary: true,
                    specs:  '<%= conf.spec %>/*-spec.js',
                    helpers: '<%= conf.spec %>/helpers/*.js',
                    version: '2.0.0',
                    outfile: '<%= conf.spec %>/index-browserify.html',
                    keepRunner: true
                },
                src: [
                    'bundle.js'
                ]
            }
        },
        'saucelabs-jasmine': {
            all: {
                options: {
                    urls: ['http://localhost:8888/spec/'],
                    tunnelTimeout: 5,
                    build: process.env.TRAVIS_JOB_ID,
                    concurrency: 3,
                    browsers: [
                        {
                            browserName: 'firefox',
                            version: '25',
                            platform: 'linux'
                        },
                        {
                            browserName: 'safari',
                            version: '7',
                            platform: 'OS X 10.9'
                        },
                        {
                            browserName: 'internet explorer',
                            version: '10',
                            platform: 'WIN8'
                        }
                    ],
                    testname: '<%= conf.pkg.npmName %>.js'
                }
            }
        },
        jsdoc2md: {
            dist: {
                src: 'dc.js',
                dest: 'web/docs/api-latest.md'
            }
        },
        docco: {
            options: {
                dst: '<%= conf.web %>/docs',
                basepath: '<%= conf.web %>'
            },
            howto: {
                files: [
                    {
                        src: ['<%= conf.web %>/stock.js']
                    }
                ]
            }
        },
        copy: {
            'dc-to-gh': {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['<%= conf.pkg.npmName %>.css', '<%= conf.pkg.npmName %>.min.css'],
                        dest: '<%= conf.web %>/css/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            '<%= conf.pkg.npmName %>.js',
                            '<%= conf.pkg.npmName %>.js.map',
                            '<%= conf.pkg.npmName %>.min.js',
                            '<%= conf.pkg.npmName %>.min.js.map',
                            'node_modules/d3/d3.js',
                            'node_modules/crossfilter/crossfilter.js',
                            'test/env-data.js'
                        ],
                        dest: '<%= conf.web %>/js/'
                    }
                ]
            }
        },
        fileindex: {
            'examples-listing': {
                options: {
                    format: formatFileList,
                    absolute: true,
                    title: 'Index of dc.js examples',
                    heading: 'Examples of using dc.js',
                    description: 'An attempt to present a simple example of each chart type.',
                    sourceLink: 'https://github.com/dc-js/dc.js/tree/master/<%= conf.web %>/examples'
                },
                files: [
                    {dest: '<%= conf.web %>/examples/index.html', src: ['<%= conf.web %>/examples/*.html']}
                ]
            },
            'transitions-listing': {
                options: {
                    format: formatFileList,
                    absolute: true,
                    title: 'Index of dc.js transition tests',
                    heading: 'Eyeball tests for dc.js transitions',
                    description: 'Transitions can only be tested by eye. ' +
                        'These pages automate the transitions so they can be visually verified.',
                    sourceLink: 'https://github.com/dc-js/dc.js/tree/master/<%= conf.web %>/transitions'
                },
                files: [
                    {dest: '<%= conf.web %>/transitions/index.html', src: ['<%= conf.web %>/transitions/*.html']}
                ]
            },
            'resizing-listing': {
                options: {
                    format: formatFileList,
                    absolute: true,
                    title: 'Index of dc.js resizing tests',
                    heading: 'Eyeball tests for resizing dc.js charts',
                    description: 'It\'s a lot easier to test resizing behavior by eye. ' +
                        'These pages fit the charts to the browser dynamically so it\'s easier to test.',
                    sourceLink: 'https://github.com/dc-js/dc.js/tree/master/<%= conf.web %>/resizing'
                },
                files: [
                    {dest: '<%= conf.web %>/resizing/index.html', src: ['<%= conf.web %>/resizing/*.html']}
                ]
            }
        },

        'gh-pages': {
            options: {
                base: '<%= conf.web %>',
                message: 'Synced from from master branch.'
            },
            src: ['**']
        },
        browserify: {
            dev: {
                src: '<%= conf.pkg.npmName %>.js',
                dest: 'bundle.js',
                options: {
                    browserifyOptions: {
                        standalone: 'dc'
                    }
                }
            }
        },
        exec: {
            compile_sass: {
              cmd: './node_modules/node-sass/bin/node-sass scss/chart.scss chart.css'
            }
        }
    });

    grunt.registerTask('merge', 'Merge a github pull request.', function (pr) {
        grunt.log.writeln('Merge Github Pull Request #' + pr);
        grunt.task.run(['shell:merge:' + pr, 'test' , 'shell:amend']);
    });
    grunt.registerTask('test-stock-example', 'Test a new rendering of the stock example web page against a ' +
        'baseline rendering', function (option) {
            require('./regression/stock-regression-test.js').testStockExample(this.async(), option === 'diff');
        });
    grunt.registerTask('update-stock-example', 'Update the baseline stock example web page.', function () {
        require('./regression/stock-regression-test.js').updateStockExample(this.async());
    });
    grunt.registerTask('watch:jasmine-docs', function () {
        grunt.config('watch', {
            options: {
                interrupt: true
            },
            runner: grunt.config('watch').jasmineRunner,
            scripts: grunt.config('watch').scripts
        });
        grunt.task.run('watch');
    });


    // task aliases
    grunt.registerTask('sass', ['exec:compile_sass']);
    grunt.registerTask('build', ['concat', 'uglify', 'sass', 'cssmin']);
    grunt.registerTask('docs', ['build', 'copy', 'jsdoc2md', 'docco', 'fileindex']);
    grunt.registerTask('web', ['docs', 'gh-pages']);
    grunt.registerTask('server', ['docs', 'fileindex', 'jasmine:specs:build', 'connect:server', 'watch:jasmine-docs']);
    grunt.registerTask('test', ['build', 'jasmine:specs']);
    grunt.registerTask('test-browserify', ['build', 'browserify', 'jasmine:browserify']);
    grunt.registerTask('coverage', ['build', 'jasmine:coverage']);
    grunt.registerTask('ci', ['test', 'jasmine:specs:build', 'connect:server', 'saucelabs-jasmine']);
    grunt.registerTask('ci-pull', ['test', 'jasmine:specs:build', 'connect:server']);
    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('default', ['build']);
    grunt.registerTask('jsdoc', ['build', 'jsdoc2md', 'watch:jsdoc2md']);
};

module.exports.jsFiles = [
    'src/banner.js',   // NOTE: keep this first
    'src/core.js',
    'src/errors.js',
    'src/utils.js',
    'src/logger.js',
    'src/events.js',
    'src/filters.js',
    'src/base-mixin.js',
    'src/margin-mixin.js',
    'src/color-mixin.js',
    'src/map-mixin.js', // MapD specific
    'src/raster-mixin.js', // MapD specific
    'src/bubble-raster-chart.js', // MapD specific
    'src/poly-raster-chart.js', // MapD specific
    'src/map-chart.js', // MapD specific
    'src/coordinate-grid-mixin.js',
    'src/stack-mixin.js',
    'src/cap-mixin.js',
    'src/bubble-mixin.js',
    'src/pie-chart.js',
    'src/bar-chart.js',
    'src/line-chart.js',
    'src/data-count.js',
    'src/number-chart.js',
    'src/data-table.js',
    'src/mapd-table.js',
    'src/data-grid.js',
    'src/bubble-chart.js',
    'src/composite-chart.js',
    'src/series-chart.js',
    'src/geo-choropleth-chart.js',
    'src/bubble-overlay.js',
    'src/row-chart.js',
    'src/count-widget.js', // MapD specific
    'src/cloud-chart.js', // MapD specific
    'src/legend.js',
    'src/legend-continuous.js', // MapD specific
    'src/legend-cont.js', // MapD specific
    'src/scatter-plot.js',
    'src/number-display.js',
    'src/heatmap.js',
    'src/d3.box.js',
    'src/box-plot.js',
    'src/footer.js'  // NOTE: keep this last
];
