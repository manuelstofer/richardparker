'use strict';

var runtime = require('./runtime.js'),
    each    = runtime.each;

exports = module.exports = render;
exports.compile = compile;

/**
 * Render template a string with data
 *
 * @param {String} str
 * @param {Object} data
 * @param {Object} options
 * @return {String}
 */
function render (str, data, options) {
    return compile(str, options)(data);
}

/**
 * Compile a template to a Javascript
 *
 * @param {String} input
 * @param {Object} options
 * @return {*}
 */
function compile (input, options) {
    options = options || {};
    var macros  = options.macros || {},
        tree    = parse('out ' + input, options);

    function transform (tree) {

        var macroName = helper.parseArg(tree),
            macro = macros[macroName] || nativeMacros[macroName];

        if (macro) {
            return macro(tree, transform);
        }

        throwError('Not a macro: "' + macroName + '"', options);
    }

    return helper.wrapTemplate(transform(tree), options);
}

function throwError(message, options) {
    throw new Error(
        message +
        '\nFile: ' + options.file
    );
}

/**
 * Parse str in a tree structure
 * '{example {foo {bar}} {bla}}'
 * ->
 *    [
 *      'example ',
 *      ['foo ', ['bar']],
 *      ' ',
 *      ['bla']
 *    ]
 *
 * @param str
 * @return {Array}
 */
function parse (str, options) {
    var results = [''],
        current = results,
        stack = [],
        parent;

    for (var i = 0; i < str.length; i++) {
        switch (str[i]) {
            case '{':
                stack.push(current);
                current = [''];
                break;
            case '}':
                parent = stack.pop();
                parent.push(current);
                current = parent;
                current.push('');
                break;
            default:
                current[current.length - 1] += str[i];
        }
    }
    if (stack.length !== 0) {
        throwError('Unmatched curly bracket', options);
    }
    return results;
}


/**
 * Some bundled macros
 */
var nativeMacros = {

    /**
     * Resolves a value
     * for example:
     * {.pages[3].title} or also just {.}
     *
     * @param tree
     * @return {String}
     */
    '.': function (tree) {
        var path = helper.parsePath(tree);
        return '__out.push(resolve(addToPath(path, "' + path + '"), data));';
    },

    /**
     * Moves down in path
     * {-> person.name {path}} -> person.name
     * @param tree
     * @param transform
     * @return {String}
     */
    '->': function (tree, transform) {
        var path = helper.parsePath(tree);
        return helper.keepPath(
            'path = addToPath(path, "' + path + '");\n' +
            helper.transformTree(tree, transform) + '\n'
        );
    },

    /**
     * Checks if a path exists
     * for example:
     * {has title <h1>{. title}</h1>}
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    has: function (tree, transform) {
        var path = helper.parsePath(tree);
        return  'if (typeof resolve(addToPath(path, "' + path + '"), data) !== "undefined") {\n' +
            helper.transformTree(tree, transform) + '\n' +
            '}';
    },

    /**
     * Iterates over an array or object
     * for example:
     * <ul>
     *  {each pages
     *    <li>{. title}</li>
     *  }
     * </ul>
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    each: function (tree, transform) {
        var path = helper.parsePath(tree);
        return helper.keepPath(
            'path = addToPath(path, "' + path + '");\n' +
            'each(resolve(path, data), function (__itemPath) {' +
                helper.keepPath('path = addToPath(path, __itemPath);' + helper.transformTree(tree, transform)) + '\n' +
            '});'
        );
    },

    /**
     * Outputs the current path
     * for example:
     * {each foo {path bar} } -> foo.0.bar foo.1.bar
     * @param tree
     * @return {String}
     */
    path: function (tree) {
        var path = helper.parsePath(tree);
        return '__out.push(addToPath(path, "' + path + '"));';
    },

    /**
     * Output ast, for internal use
     */
    out: function (tree, transform) {
        return helper.transformTree(tree, transform);
    }
};

/**
 * Some helper functions for generating javascript in macros
 *
 * @type {Object}
 */
var helper = {

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

    parsePath: function (tree) {
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
     * Creates a closure for the path.
     *  ->  Useful when modifying the current path in a macro
     *      so it not required to be restored after.
     *
     * @param {String} code
     * @return {String}
     */
    keepPath: function (code) {
        return '(function (path) {\n' + code + '\n}(path));';
    },

    /**
     * Wrap code into the template function
     *
     * @param code
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

        return new Function('data',
            'var path = "", __out = [];\n data = data || {};\n' +
                runtimeCode +
                code + '\n' +
                'return __out.join("");'
        );
    }
};

compile.helper = helper;