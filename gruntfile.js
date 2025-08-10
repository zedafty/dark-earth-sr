module.exports = function(grunt) {
	grunt.initConfig({
		htmlmin: {
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true,
					collapseInlineTagWhitespace: false,
					removeTagWhitespace: false,
					continueOnParseError: true,
					keepClosingSlash: true
				},
				files: {
					"tmp/1-sheet.html": "src/1-sheet.html",
					"tmp/2-templates.html": "src/2-templates.html"
				}
			}
		},
		cssmin: {
			target: {
				files: {
					"tmp/1-styles.css": ["src/1-styles.css", "src/2-templates.css"]
				}
			}
		},
		uglify: {
			worker: {
				files: {
					"tmp/3-worker.js": ["src/3-worker.js"]
				}
			}
		},
		replace: {
			html: {
				options: {
					patterns: [
						{match: "> <", replacement: "><"},
					],
					usePrefix: false,
					silent: true
				},
				files: [
					{expand: true, flatten: true, src: ["tmp/1-sheet.html", "tmp/2-templates.html"], dest: "tmp"}
				]
			},
			translation: {
				options: {
					patterns: [
						{match: new RegExp("\t//.*", "gi"), replacement: ""},
						{match: new RegExp(", //.*", "gi"), replacement: ","},
						{match: new RegExp("(\n)(\n)+", "gi"), replacement: "$1"}
					],
					usePrefix: false,
					silent: true
				},
				files: [
					{src: ["src/0-en.json"], dest: "translation.json"},
					{src: ["src/0-fr.json"], dest: "translations/fr.json"}
				]
			},
			worker: {
				options: {
					patterns: [
						{match: new RegExp("^", "i"), replacement: '<script type="text/worker">'},
						{match: new RegExp("$", "i"), replacement: '</script>'}
					],
					usePrefix: false,
					silent: true
				},
				files: [
					{src: ["tmp/3-worker.js"], dest: "tmp/3-worker.js"}
				]
			}
		},
		concat: {
			html: {
				src: ["tmp/1-sheet.html", "tmp/2-templates.html", "tmp/3-worker.js"],
				dest: "dark-earth-sr.html",
				nonull: true
			},
			css: {
				src: ["src/0-import.css", "tmp/1-styles.css"],
				dest: "dark-earth-sr.css",
				nonull: true
			}
		}
	});

	// Load the plugin that provides the tasks
	grunt.loadNpmTasks("grunt-contrib-htmlmin");
	grunt.loadNpmTasks("grunt-contrib-cssmin");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-replace");
	grunt.loadNpmTasks("grunt-contrib-concat");

	// Default tasks
	grunt.registerTask("default", ["htmlmin", "cssmin", "uglify", "replace", "concat"]);

};
