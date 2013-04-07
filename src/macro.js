var helper = require('./helper');

/**
 * Some bundled macros
 */
module.exports = {

    /**
     * Resolves a value
     * for example:
     * {.pages[3].title} or also just {.}
     *
     * @param tree
     * @return {String}
     */
    '.': function (tree) {
        var pointer = helper.parsePointer(tree);
        return '__out.push(resolve(data, addToPointer(pointer, "' + pointer + '")));';
    },

    /**
     * Moves down in pointer
     * {-> person.name {pointer}} -> person.name
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    '->': function (tree, transform) {
        var pointer = helper.parsePointer(tree);
        return helper.keepPointer(
            'pointer = addToPointer(pointer, "' + pointer + '");\n' +
                helper.transformTree(tree, transform) + '\n'
        );
    },

    /**
     * Checks if a pointer exists
     * for example:
     * {has title <h1>{. title}</h1>}
     *
     * @param tree
     * @param transform
     * @return {String}
     */
    has: function (tree, transform) {
        var pointer = helper.parsePointer(tree);
        return  'if (resolve(data, addToPointer(pointer, "' + pointer + '"))) {\n' +
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
        var pointer = helper.parsePointer(tree);
        return helper.keepPointer(
            'pointer = addToPointer(pointer, "' + pointer + '");\n' +
                'each(resolve(data, pointer), function (__itemPointer) {' +
                helper.keepPointer('pointer = addToPointer(pointer, __itemPointer);' + helper.transformTree(tree, transform)) + '\n' +
                '});'
        );
    },

    /**
     * Outputs text
     * for example:
     * {literal {hello: bla}} -> {hello: bla}
     *
     * @param tree
     * @return {String}
     */
    literal: function (tree) {

        function rejoin (tree) {
            var res = [];
            for (var i = 0; i < tree.length; i++) {
                var item = tree[i];
                if (item instanceof Array) {
                    item = '{' + rejoin(item) + '}';
                }
                res.push(item);
            }
            return res.join('');
        }
        return '__out.push("' + helper.escapeJS(rejoin(tree)) + '");';
    },

    /**
     * Outputs the current pointer
     * for example:
     * {each foo {pointer bar} } -> foo.0.bar foo.1.bar
     *
     * @param tree
     * @return {String}
     */
    pointer: function (tree) {
        var pointer = helper.parsePointer(tree);
        return '__out.push(addToPointer(pointer, "' + pointer + '"));';
    },

    /**
     * Output ast, for internal use
     */
    out: function (tree, transform) {
        return helper.transformTree(tree, transform);
    },

    /**
     * Calls a user defined function
     */
    fn: function (tree) {
        var fnName = helper.parsePointer(tree);
        return '__out.push(options.fn.' + fnName + '(pointer, data));';
    }
};