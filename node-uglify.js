var         uglifyJS    = require("uglify-js");
var         CleanCSS    = require('clean-css');
var             walk    = require('walk');
var               fs    = require('fs');
var             path    = require('path');
var           rimraf    = require('rimraf');
var             gulp    = require('gulp');
var gulp_minify_html    = require('gulp-minify-html');
var      gulp_rename    = require('gulp-rename');


/* Constantes */
var UGLIFYJS_OPTIONS = {
	fromString      : false,
	warnings        : false,
	mangle          : true,
	compress        : true,
	drop_console    : true,
	join_vars       : true,
	dead_code       : false,
	mangle_toplevel : false, //todo: test true,
	no_copyright    : true
};
	
var HTML_VIEWSMIN_PATH = './app/views.min';
var HTML_DIRECTIVESMIN_PATH = './app/directives.min';

var DATA_TO_MINIMIZE = [
	{codeType: 'js', type : 'file',     name : 'app/App.js',                              minName : 'app/App.min.js'},
	{codeType: 'js', type : 'file',     name : 'app/embXDMcomm.js',                       minName : 'app/embXDMcomm.min.js'},
	{codeType: 'js', type : 'folder',   name : 'app/constants',                           minName : 'app/constants.min.js'},
	{codeType: 'js', type : 'folder',   name : 'app/controllers',                         minName : 'app/controllers.min.js'},
	{codeType: 'js', type : 'folder',   name : ['app/directives'
											   ,'app/directives.common'],                 minName : 'app/directives.min.js'},
	{codeType: 'js', type : 'folder',   name : ['app/factories'
											   ,'app/factories.common'],                  minName : 'app/factories.min.js'},
	{codeType: 'js', type : 'folder',   name : ['app/filters'
											   ,'app/filters.common'],                    minName : 'app/filters.min.js'},
	{codeType: 'js', type : 'folder',   name : 'app/models',                              minName : 'app/models.min.js'},
	{codeType: 'js', type : 'file',     name : 'js.common/betuniq.system.js',             minName : 'js.common/betuniq.system.min.js'},
	{codeType: 'js', type : 'file',     name : 'js.common/betuniq.system.rest.js',        minName : 'js.common/betuniq.system.rest.min.js'},
	{codeType: 'js', type : 'file',     name : 'js.common/betuniq.system.encrypt.js',     minName : 'js.common/betuniq.system.encrypt.min.js'},
	{codeType: 'js', type : 'folder',   name : 'js.common/betuniq.system.encrypt.kit',    minName : 'js.common/betuniq.system.encrypt.kit.min.js'},
		
	{codeType: 'css', type : 'file',    name : 'css/uglify/betuniq.css',        		  minName : 'css/compressed/betuniq.min.css'},

	{codeType: 'css', type : 'file',    name : 'css/standalone/underconstruction.css',    minName : 'css/compressed/underconstruction.min.css'},
	{codeType: 'css', type : 'file',    name : 'css/override/isbets_fix_webadmin.css',    minName : 'css/compressed/isbets_fix_webadmin.min.css'},
	{codeType: 'css', type : 'file',    name : 'css/override/sportbook-override.css',     minName : 'css/compressed/sportbook-override.min.css'},
	{codeType: 'css', type : 'file',    name : 'css/override/livewidgets-override.css',   minName : 'css/compressed/livewidgets-override.min.css'},
	
	{codeType: 'html', type : 'file',   name : 'old-browser.html',                        minName : 'old-browser.min.html',                          htmlType:'oldBrowser'},
	{codeType: 'html', type : 'folder', name : 'app/views',                               htmlType: 'views'},
	{codeType: 'html', type : 'folder', name : 'app/directives',                          htmlType: 'directives'}
];

	
/* Initialize mimize files */
for(var i in DATA_TO_MINIMIZE){
	processFiles(DATA_TO_MINIMIZE[i]);
}
	
/* Process each file type to minimize */
function processFiles(data) {
	if (data.type == 'folder') {
		var files   = [];
		var folders = (typeof data.name == "object") ? data.name : [ data.name ];
		
		var counter = 0;
		for (var key in folders) {
			walk.walk('./' + folders[key], { followLinks: false })
			  .on('file', function(root, stat, next) {
				// Add this file to the list of files
				// Walker options
				files.push(root + '/' + stat.name);
				next();
			}).on('end', function() {				
				counter++;
			
				if (counter === folders.length) {				
					minimize(files, data);
				}
			});
		}
	}
	else {
		minimize([ './'+ data.name ], data);
	}	
}
	
/* Minimize files by type */
function minimize(files, data){
	switch (data.codeType) {
		case 'js':
			minimizeJs(files, data);
			break;			
		case 'html':
			minimizeHtml(files, data);
			break;			
		case 'css':
			minimizeCss(files, data);
			break;			
		default:
			console.error('Type to minmize unknown:' + data.codeType);
			break;
	}
}


/*
 * Minimize methods.
 */


function minimizeCss(files, data){
	var minCss = '';
	for (var i in files) {
		minCss += getMinCss(files[i]);
	}
	
	writeFile(data.minName, minCss);
}

function minimizeJs(files, data){
	var cleanFiles = getCleanFiles(files, 'js');
	
	try {
		var result = uglifyJS.minify(cleanFiles, UGLIFYJS_OPTIONS);
		writeFile('./'+ data.minName, result.code);
	}
	catch(e){
		console.error(e);
	}
}

function minimizeHtml(files, data) {
	var cleanFiles = getCleanFiles(files, 'html');
	var destPath = '';
	var pathPattern = '';
	var file = '';
	var path = '';
	var destName = '';
	
	switch (data.htmlType) {
		case 'views':
			pathPattern = /^.\/app\/views\/(.*)\/([^\/]*)$/;
			destPath = HTML_VIEWSMIN_PATH;
			break;			
		case 'directives':
			destPath = HTML_DIRECTIVESMIN_PATH;
			pathPattern = /^.\/app\/directives\/(.*)\/([^\/]*)$/;
			break;	
		case 'oldBrowser':
			destPath = '.';
			file = data.name;
			destName = data.minName;
			break;	
			
	}
	
	// remove root directory for views
	try { if (data.type == 'folder') err = rimraf.sync(destPath); } catch(e) { console.error(e); }  
	//err = fs.mkdirSync(path, mask); --> NO ES RECURSIVO
	for (var i in cleanFiles) {
		if (pathPattern !== '') {
			file = cleanFiles[i].replace(pathPattern, '$2');
			path = cleanFiles[i].replace(pathPattern, '$1');
			destName = file;
		}
		getMinHtml(cleanFiles[i], file, destPath + '/' + path, destName);
	}
}

/*
 * Helpers
 */


function getCleanFiles(files, type) {
	var cleanFiles = [];
	for (var i in files) {
		if( files[i].indexOf('.'+type) > -1 && files[i].indexOf('.min.'+type) === -1  ){
			cleanFiles.push(files[i]);
		}
	}
	
	return cleanFiles;
}

function getMinCss(file){
	if(file.indexOf('.css') == -1 || file.indexOf('.min.css') != -1) return '';
			
	var data = fs.readFileSync(file);
	return new CleanCSS().minify(data);	
}

function getMinHtml(file, fileName, destPath, destName) {
	var opts = {empty:true};

	try {
		gulp.src(file)
			.pipe(gulp_minify_html(opts))
			.pipe(gulp_rename(destName))
			.pipe(gulp.dest(destPath));
			
		console.log(destPath + destName + ' -- OK.');
	}
	catch (e) {
		console.log(destPath + destName + ' -- FAIL.');
		console.log(e);
	}
}

function writeFile(file, data){
	fs.writeFile(file, data, function(err) {
		if(err) {
			console.log(file + ' -- FAIL.');
			console.log(err);
			console.log('----------------');
		} else {
			console.log(file + ' -- OK.');
		}		
		file = null;
		data = null;
	});
}