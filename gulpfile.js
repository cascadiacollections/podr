// @ts-check
'use strict';

const build = require('@microsoft/node-library-build');
const sass = require('@microsoft/gulp-core-build-sass').default;

build.task('build', build.serial(sass, build.buildTasks));

build.initialize(require('gulp'));
