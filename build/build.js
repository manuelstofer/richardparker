

/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};
require.register("richardparker/index.js", function(exports, require, module){
'use strict';

exports = module.exports = render;
exports.compile = compile;

/**
 * Render template a string with data
 *
 * @param {String} str
 * @param {Object} data
 * @param {Object} macros
 * @return {String}
 */
function render (str, data, macros) {
    return compile(str, macros)(data);
}

/**
 * Compile a template to a Javascript
 *
 * @param {String} input
 * @param macros
 * @return {*}
 */
function compile (input, macros) {
    macros = macros || {};

    var tree = parse('out ' + input);

    function transform (tree) {

        var macroName = helper.parseArg(tree),
            macro = macros[macroName] || nativeMacros[macroName];

        if (macro) {
            return macro(tree, transform);
        }

        throw new Error('Not a macro:' + macroName);
    }

    return helper.wrapTemplate(transform(tree));
}

/**
 * Parse str in a tree structure
 * '{example {foo {bar}} {bla}}'
 * -> [
 *      'example ',
 *      ['foo ', ['bar']],
 *      ' ',
 *      ['bla']
 *    ]
 *
 * @param str
 * @return {Array}
 */
function parse (str) {
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
        throw new Error('Unmatched brace');
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
        return '__out.push(resolve(path + "' + path + '"));';
    },

    /**
     * Moves down in path
     * {-> .person.name {path}} -> .person.name
     * @param tree
     * @param transform
     * @return {String}
     */
    '->': function (tree, transform) {
        var path = helper.parsePath(tree);
        return helper.keepPath(
            'path += "' + helper.escapeJS(path) + '";\n' +
                helper.transformTree(tree, transform) + '\n'
        );
    },

    /**
     * Checks if a path exists
     * for example:
     * {has .title <h1>{.title}</h1>}
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    has: function (tree, transform) {
        var path = helper.parsePath(tree);
        return  'if (typeof resolve(path + "' + path + '") !== "undefined") {\n' +
            helper.transformTree(tree, transform) + '\n' +
            '}';
    },

    /**
     * Iterates over an array or object
     * for example:
     * <ul>
     *  {each .pages
     *    <li>{.title}</li>
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
            'path += "' + path + '";\n' +
                'each(resolve("' + path + '"), function (__itemPath) {' +
                helper.keepPath('path += "." + __itemPath; ' + helper.transformTree(tree, transform)) + '\n' +
                '});'
        );
    },

    /**
     * Outputs the current path
     * for example:
     * {each .foo {path .bar}, } -> .foo[0].bar, .foo[1].bar ...
     * @param tree
     * @return {String}
     */
    path: function (tree) {
        var path = helper.parsePath(tree);
        return '__out.push(path + "' + path + '");';
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
        return (helper.parseArg(tree) || '')
            .replace(/(\["?|"?])/g, '.')    // . notation for objects and arrays
            .replace(/^(?=[^\.])/g, '.')    // always prefixed with .
            .replace(/\.$/g, '');           // never ending with .
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
    wrapTemplate: function (code) {
        return new Function('data',
            'var path = "", __out = [];\n data = data || {};\n' +
                resolve.toString() + '\n' +
                each.toString() + '\n' +
                code + '\n' +
                'return __out.join("");'
        );
    }
};

compile.helper = helper;

/**
 * Runtime method: resolving a path in the data
 *
 * @param {String} path
 * @return {*}
 */
function resolve (path) {
    var obj = data,
        parts = path
            .split(/\./)
            .filter(function (part) { return part !== ''; });

    while (parts.length > 0 && obj[parts[0]]) {
        obj = obj[parts[0]];
        parts.shift();
    }
    if (parts.length > 0) {
        return;
    }
    return obj;
}

/**
 * Iterate over an object or array
 * - included in runtime
 *
 * @param obj
 * @param iterator
 */
function each (obj, iterator) {
    if (!obj) return;
    if (obj instanceof Array) {
        for (var i = 0; i < obj.length; i++) {
            iterator(i, obj[i]);
        }
    } else {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                iterator(key, obj[key]);
            }
        }
    }
}

});

