
var runtime = require('./runtime'),
    each    = runtime.each;

/**
 * Some helper functions for generating javascript in macros
 *
 * @type {Object}
 */

var helper;

module.exports = helper = {

    /**
     * Read until the first white space in the first string of the AST
     *
     * @param [tree]
     * @return {String}
     */
    parseArg: function (tree) {
        var arg = String(/^\S+/.exec(String(tree[0])) || '');
        tree[0] = tree[0].substr(arg.length).replace(/^\s+/, '');
        return arg;
    },

    parsePointer: function (tree) {
        return helper.parseArg(tree) || '';
    },

    /**
     * Escape a string not to interfere with javascript syntax
     *
     * @param {String} str
     * @return {String}
     */
    escapeJS: function (str) {
        return String(str)
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n');
    },

    /**
     * Output a string
     *
     * @param {String} str
     * @return {String}
     */
    output: function (str) {
        if (str === '') { return ''; }
        return '__out.push("' + helper.escapeJS(str) +'");';
    },

    /**
     * Transform a part of the AST
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    transformTree: function (tree, transform) {
        var out = '';
        each(tree, function (i, item) {
            if (typeof item === 'string') {
                out += helper.output(item);
            } else {
                out += transform(item, transform);
            }
        });
        return out;
    },

    /**
     * Creates a closure for the pointer.
     *  ->  Useful when modifying the current pointer in a macro
     *      so it not required to be restored after.
     *
     * @param {String} code
     * @return {String}
     */
    keepPointer: function (code) {
        return '(function (pointer) {\n' + code + '\n}(pointer));';
    },

    /**
     * Wrap code into the template function
     *
     * @param code
     * @param options
     * @return {String}
     */
    wrapTemplate: function (code, options) {
        var runtimeCode = '',
            includeRuntime = options.includeRuntime;

        if (includeRuntime === true || includeRuntime === undefined) {
            each(runtime, function (index, fn){
                runtimeCode += fn.toString();
            })
        }

        return new Function('data', 'options',
            'options = options || {};' +
            'var pointer = options.pointer || "",\n__out = [];\n data = data || {};\n' +
            runtimeCode +
            code + '\n' +
            'return __out.join("");'
        );
    }
};
