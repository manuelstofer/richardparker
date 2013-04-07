
module.exports = {
    each:       each,
    resolve:    resolve,
    addToPointer:  addToPointer
};


/**
 * Looksup a json pointer
 *
 * @param obj
 * @param pointer
 * @returns {*}
 */
function resolve (obj, pointer) {

    var unescape = function (str) {
            return str.replace(/~1/g, '/').replace(/~0/g, '~');
        },
        parse = function (pointer) {
            if (pointer === '') { return []; }
            if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer:' + pointer); }
            return pointer.substring(1).split(/\//).map(unescape);
        },
        tok,
        refTokens = parse(pointer);

    while (refTokens.length) {
        tok = refTokens.shift();
        if (!obj.hasOwnProperty(tok)) {
            return;
        }
        obj = obj[tok];
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

/**
 * Extends the pointer
 *
 * @param pointer
 * @param refToken
 * @return {String}
 */
function addToPointer (pointer, refToken) {
    var escape = function (str) {
        return str.replace(/~/g, '~0');
    };
    pointer = String(pointer);
    refToken = escape(String(refToken));

    if (refToken === '') {
        return pointer;
    }
    return pointer.replace(/\/*$/, '/') + refToken.replace(/^\/+/, '');
}