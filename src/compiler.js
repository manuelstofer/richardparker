'use strict';

var runtime         = require('./runtime'),
    helper          = require('./helper'),
    nativeMacros    = require('./macro'),
    each            = runtime.each;

module.exports = {
    render:     render,
    compile:    compile,
    helper:     helper
};

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
 * Compile a template to a Javascript function
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
 * @param options
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
