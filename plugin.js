const path = require('path');
const gulp = require('gulp');
const rev = require('gulp-rev');
var revCollector = require('gulp-rev-collector');

const getResources1 = (dir) => {
    return [
        dir + '/**/*.*',
        // exclude
        '!' + dir + '/**/*.html',
    ];
}

const getResources2 = (dir) => {
    return [
        dir + '/**/*.html',
    ];
}

function revManifestTask(inputPath, outputDir) {
    return function (done) {
        return gulp.src(getResources1(inputPath))
            .pipe(rev())
            .pipe(gulp.dest(outputDir))
            .pipe(rev.manifest())
            .pipe(gulp.dest(outputDir))
            .pipe(gulp.src(getResources2(inputPath)))
            .pipe(gulp.dest(outputDir))
    }
}

function revCollectorTask(revJson, outputDir) {
    console.log(revJson);
    return function (done) {
        return gulp.src([revJson, outputDir + "/**/*.*"])
            .pipe(revCollector({
                replaceReved: true
            }))
            .pipe(gulp.dest(outputDir));
    }
}

function plugin(program) {
    let inputPath = program.output;
    let outputDir = path.join(program.output, "v" + Date.now());
    let revJson = path.join(outputDir, "rev-manifest.json");
    gulp.task('plugin-rev-manifest', revManifestTask(inputPath, outputDir));
    gulp.task('plugin-rev-collector', revCollectorTask(revJson, outputDir));
    return gulp.series([
        'plugin-rev-manifest',
        'plugin-rev-collector'
    ]);
}

module.exports = {
    plugin
}