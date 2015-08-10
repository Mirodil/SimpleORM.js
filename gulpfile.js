// SimpleORM.JS - created with Gulp Fiction

var gulp = require("gulp");
var concat = require("gulp-concat");
var browserify = require('gulp-browserify');

//gulp.task("default", function () {
//    gulp.src([{ "path": "./lib/**/*.js" }])
//        .pipe(concat("orm.js"))
//        .pipe(gulp.dest("./build/"));
//});

//gulp.task("watch", [], function () {
//    gulp.watch("./lib/**/*.js", ["default"]);
//});

gulp.task('default', function () {
    gulp.src("./lib/*.js")
        .pipe(concat("orm.js"))
        .pipe(gulp.dest("./build/"));
});

gulp.task('browserify', function () {
    // Single entry point to browserify 
    gulp.src('./lib/database.js')
        .pipe(browserify({
            transform: ['debowerify'],
            insertGlobals: true,
            debug: !gulp.env.production
        }))
        .pipe(gulp.dest('./build'))
});

gulp.task("watch", [], function () {
    gulp.watch("./lib/**/*.js", ["default"]);
});