const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpRev = require('gulp-rev');
const gulpReplace = require('gulp-replace');

function unlinkSync(file) {
    try {
        fs.unlinkSync(file);
    } catch (error) {
    }
}

function existsSync(file) {
    try {
        return fs.existsSync(file);
    } catch (error) {
    }
    return false;
}

function readJson(file) {
    if (existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file));
        } catch (error) {
        }
    }
    return {};
}

function writeFileSync(file, content) {
    try {
        fs.writeFileSync(file, content);
    } catch (error) {
    }
}

function formatDate(date, format = "yyyy-MM-dd") {
    if (date instanceof Date) {
        var fmap = {
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds(),
            'q+': Math.floor((date.getMonth() + 3) / 3),
            'S+': date.getMilliseconds()
        }
        if (/(y+)/i.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
        }
        for (var k in fmap) {
            if (new RegExp('(' + k + ')').test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length === 1
                    ? fmap[k] : ('00' + fmap[k]).substr(('' + fmap[k]).length))
            }
        }
        return format
    }
    return '';
}

function unique(arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
        for (var j = i + 1; j < arr.length; j++) {
            if (arr[i] == arr[j]) {
                ++i;
            }
        }
        newArr.push(arr[i]);
    }
    return newArr;
}

function manifestTask(manifestName, inputPath, outputDir) {
    return function (done) {
        let srcList = [inputPath + '/**/*.*', '!' + inputPath + '/**/*.html'];
        return gulp.src(srcList).pipe(gulpRev())
            .pipe(gulp.dest(outputDir))
            .pipe(gulpRev.manifest({ path: manifestName }))
            .pipe(gulp.dest(outputDir))
            .pipe(gulp.src(`${inputPath}/**/*.html`))
            .pipe(gulp.dest(outputDir))
    }
}

function versionTask(manifestFile, manifestName, verManifestName, outputDir) {
    return function (done) {
        let manifestJson = readJson(manifestFile);
        let versionPath = manifestJson[manifestName];
        if (versionPath) {
            unlinkSync(path.join(outputDir, versionPath));
        }
        manifestJson[manifestName] = verManifestName;
        writeFileSync(path.join(outputDir, verManifestName), JSON.stringify(manifestJson, null, 2));
        unlinkSync(manifestFile);
        done && done();
    }
}

function replaceTask(srcList, manifestFile, outputDir) {
    return function () {
        let manifestJson = readJson(manifestFile);
        let replaceList = Object.keys(manifestJson).map((key) => {
            return [key, manifestJson[key]];
        })
        var task = gulp.src(srcList);
        replaceList.forEach(replace => {
            if (replace instanceof Array) {
                task = task.pipe(gulpReplace(...replace));
            }
        });
        task = task.pipe(gulp.dest(outputDir));
        return task;
    }
}

function plugin(program) {
    let inputPath = program.output;
    let outputDir = path.join(program.output, "hash");
    let manifestName = "manifest.rev";
    let manifestFile = path.join(outputDir, manifestName);
    let versionManifestName = `manifest-${formatDate(new Date, "yyyyMMddhhmmssS")}.rev`;
    let versionManifestFile = path.join(outputDir, versionManifestName);
    let customTypes = `${program["rev-type"] || ""}`.split(",");
    let revTypes = unique(["html", "js", "json", "css", "atlas", ...customTypes].filter((type) => {
        return !!type;
    })).map((type) => {
        return outputDir + "/**/*." + type
    });
    revTypes.push("!" + versionManifestFile);
    gulp.task('plugin-rev-manifest', manifestTask(manifestName, inputPath, outputDir));
    gulp.task('plugin-rev-version', versionTask(manifestFile, manifestName, versionManifestName, outputDir));
    gulp.task('plugin-rev-replace', replaceTask(revTypes, versionManifestFile, outputDir));
    return gulp.series([
        'plugin-rev-manifest',
        'plugin-rev-version',
        'plugin-rev-replace',
    ]);
}

module.exports = {
    plugin
}