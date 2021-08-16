const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpRev = require('gulp-rev');
const gulpReplace = require('gulp-replace');
const Md5 = require('./utils/md5');
const FileUtils = require('./utils/file');

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

function manifestTask(program) {
    return function (done) {
        let manifestName = program.revManifestName;
        let customExcludes = `${program["rev-exclude"] || ""}`.split(",");
        let revExcludes = unique(["*.html", "*manifest.json", ...customExcludes].filter((type) => {
            return !!type;
        })).map((type) => {
            return program.revInput + "/**/" + type
        });
        let revRess = [program.revInput + '/**/*.*', ...revExcludes.map(item => '!' + item)];
        return gulp.src(revRess).pipe(gulpRev())
            .pipe(gulp.dest(program.revOutput))
            .pipe(gulpRev.manifest({ path: manifestName }))
            .pipe(gulp.dest(program.revOutput))
            .pipe(gulp.src(revExcludes))
            .pipe(gulp.dest(program.revOutput))
    }
}

function versionTask(program) {
    return function (done) {
        let manifestName = program.revManifestName;
        let manifestFile = path.join(program.revOutput, manifestName);
        let manifestJson = readJson(manifestFile);
        let manifestMd5 = Md5.hex_md5(JSON.stringify(manifestJson)).substring(2, 12);
        let versionManifestName = `manifest-${manifestMd5}.rev`;
        let orgManifestFile = manifestJson[manifestName];
        if (orgManifestFile) {
            // 替换同名资源
            unlinkSync(path.join(program.revOutput, orgManifestFile));
        }
        manifestJson[manifestName] = versionManifestName;
        program.versionManifestFile = path.join(program.revOutput, versionManifestName);
        writeFileSync(program.versionManifestFile, JSON.stringify(manifestJson, null, 2));
        unlinkSync(manifestFile);
        done && done();
    }
}

function replaceTask(program) {
    return function () {
        let customReplaces = `${program["rev-replace"] || ""}`.split(",");
        let revReplaces = unique(["*.html", "*.js", "*.json", "*.css", "*.atlas", ...customReplaces].filter((type) => {
            return !!type;
        })).map((type) => {
            return program.revOutput + "/**/" + type
        });
        revReplaces.push("!" + program.versionManifestFile);
        let manifestJson = readJson(program.versionManifestFile);
        let replaceList = Object.keys(manifestJson).map((key) => {
            return [key, manifestJson[key]];
        })
        var task = gulp.src(revReplaces);
        replaceList.forEach(replace => {
            if (replace instanceof Array) {
                task = task.pipe(gulpReplace(...replace));
            }
        });
        task = task.pipe(gulp.dest(program.revOutput));
        return task;
    }
}

function plugin(program) {
    program.revInput = program.output;
    if (program.outputVersion) {
        program.revOutput = path.join(program.output, program["rev-output"] || 'dist-rev', program.version);
    } else {
        program.revOutput = path.join(program.output, program["rev-output"] || 'dist-rev');
    }
    program.revManifestName = program["rev-manifest-name"] || "manifest.rev";
    FileUtils.deleteFolderSync(program.revOutput);
    gulp.task('plugin-rev-manifest', manifestTask(program));
    gulp.task('plugin-rev-version', versionTask(program));
    gulp.task('plugin-rev-replace', replaceTask(program));
    return gulp.series([
        'plugin-rev-manifest',
        'plugin-rev-version',
        'plugin-rev-replace',
    ]);
}

module.exports = {
    plugin
}