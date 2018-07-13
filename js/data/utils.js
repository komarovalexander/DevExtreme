"use strict";

var typeUtils = require("../core/utils/type"),
    isFunction = typeUtils.isFunction,
    extend = require("../core/utils/extend").extend,
    Guid = require("../core/guid"),
    domAdapter = require("../core/dom_adapter"),
    ready = require("../core/utils/ready_callbacks").add,
    windowUtils = require("../core/utils/window"),
    window = windowUtils.getWindow(),
    map = require("../core/utils/iterator").map,
    errors = require("./errors").errors,
    objectUtils = require("../core/utils/object"),
    toComparable = require("../core/utils/data").toComparable,
    Deferred = require("../core/utils/deferred").Deferred;

var XHR_ERROR_UNLOAD = "DEVEXTREME_XHR_ERROR_UNLOAD";

var normalizeBinaryCriterion = function(crit) {
    return [
        crit[0],
        crit.length < 3 ? "=" : String(crit[1]).toLowerCase(),
        crit.length < 2 ? true : crit[crit.length - 1]
    ];
};

var normalizeSortingInfo = function(info) {
    if(!Array.isArray(info)) {
        info = [info];
    }

    return map(info, function(i) {
        var result = {
            selector: (isFunction(i) || typeof i === "string") ? i : (i.getter || i.field || i.selector),
            desc: !!(i.desc || String(i.dir).charAt(0).toLowerCase() === "d")
        };
        if(i.compare) {
            result.compare = i.compare;
        }
        return result;
    });
};

var errorMessageFromXhr = (function() {
    var textStatusMessages = {
        "timeout": "Network connection timeout",
        "error": "Unspecified network error",
        "parsererror": "Unexpected server response"
    };

    ///#DEBUG
    var textStatusDetails = {
        "timeout": "possible causes: the remote host is not accessible, overloaded or is not included into the domain white-list when being run in the native container",
        "error": "if the remote host is located on another domain, make sure it properly supports cross-origin resource sharing (CORS), or use the JSONP approach instead",
        "parsererror": "the remote host did not respond with valid JSON data"
    };
    ///#ENDDEBUG

    var explainTextStatus = function(textStatus) {
        var result = textStatusMessages[textStatus];

        if(!result) {
            return textStatus;
        }

        ///#DEBUG
        result += " (" + textStatusDetails[textStatus] + ")";
        ///#ENDDEBUG

        return result;
    };

    // T542570, https://stackoverflow.com/a/18170879
    var unloading;
    ready(function() {
        domAdapter.listen(window, "beforeunload", function() { unloading = true; });
    });

    return function(xhr, textStatus) {
        if(unloading) {
            return XHR_ERROR_UNLOAD;
        }
        if(xhr.status < 400) {
            return explainTextStatus(textStatus);
        }
        return xhr.statusText;
    };
})();

var aggregators = {
    count: {
        seed: 0,
        step: function(count) { return 1 + count; }
    },
    sum: {
        seed: 0,
        step: function(sum, item) { return sum + item; }
    },
    min: {
        step: function(min, item) { return item < min ? item : min; }
    },
    max: {
        step: function(max, item) { return item > max ? item : max; }
    },
    avg: {
        seed: [0, 0],
        step: function(pair, value) {
            return [pair[0] + value, pair[1] + 1];
        },
        finalize: function(pair) {
            return pair[1] ? pair[0] / pair[1] : NaN;
        }
    }
};

var processRequestResultLock = (function() {
    var lockCount = 0,
        lockDeferred;

    var obtain = function() {
        if(lockCount === 0) {
            lockDeferred = new Deferred();
        }
        lockCount++;
    };

    var release = function() {
        lockCount--;
        if(lockCount < 1) {
            lockDeferred.resolve();
        }
    };

    var promise = function() {
        var deferred = lockCount === 0 ? new Deferred().resolve() : lockDeferred;
        return deferred.promise();
    };

    var reset = function() {
        lockCount = 0;
        if(lockDeferred) {
            lockDeferred.resolve();
        }
    };

    return {
        obtain: obtain,
        release: release,
        promise: promise,
        reset: reset
    };
})();

function isDisjunctiveOperator(condition) {
    return /^(or|\|\||\|)$/i.test(condition);
}

function isConjunctiveOperator(condition) {
    return /^(and|\&\&|\&)$/i.test(condition);
}

var keysEqual = function(keyExpr, key1, key2) {
    /* jshint eqeqeq:false */

    if(Array.isArray(keyExpr)) {
        var names = map(key1, function(v, k) { return k; }),
            name;
        for(var i = 0; i < names.length; i++) {
            name = names[i];
            if(toComparable(key1[name], true) != toComparable(key2[name], true)) {
                return false;
            }
        }
        return true;
    }
    return toComparable(key1, true) == toComparable(key2, true);
};

var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

var base64_encode = function(input) {
    if(!Array.isArray(input)) {
        input = stringToByteArray(String(input));
    }

    var result = "";

    function getBase64Char(index) {
        return BASE64_CHARS.charAt(index);
    }

    for(var i = 0; i < input.length; i += 3) {

        var octet1 = input[i],
            octet2 = input[i + 1],
            octet3 = input[i + 2];

        result += map(
            [
                octet1 >> 2,
                ((octet1 & 3) << 4) | octet2 >> 4,
                isNaN(octet2) ? 64 : ((octet2 & 15) << 2) | octet3 >> 6,
                isNaN(octet3) ? 64 : octet3 & 63
            ],
            getBase64Char
        ).join("");
    }

    return result;
};

var stringToByteArray = function(str) {
    var bytes = [],
        code, i;

    for(i = 0; i < str.length; i++) {
        code = str.charCodeAt(i);

        if(code < 128) {
            bytes.push(code);
        } else if(code < 2048) {
            bytes.push(192 + (code >> 6), 128 + (code & 63));
        } else if(code < 65536) {
            bytes.push(224 + (code >> 12), 128 + ((code >> 6) & 63), 128 + (code & 63));
        } else if(code < 2097152) {
            bytes.push(240 + (code >> 18), 128 + ((code >> 12) & 63), 128 + ((code >> 6) & 63), 128 + (code & 63));
        }
    }
    return bytes;
};

var isUnaryOperation = function(crit) {
    return crit[0] === "!" && Array.isArray(crit[1]);
};

var trivialPromise = function() {
    var d = new Deferred();
    return d.resolve.apply(d, arguments).promise();
};

var rejectedPromise = function() {
    var d = new Deferred();
    return d.reject.apply(d, arguments).promise();
};

function ArrayHelper(keyExpr, keyGetter) {
    var hasKey = function(target, keyOrKeys) {
        var key,
            keys = typeof keyOrKeys === "string" ? keyOrKeys.split() : keyOrKeys.slice();

        while(keys.length) {
            key = keys.shift();
            if(key in target) {
                return true;
            }
        }

        return false;
    };

    this.changeArrayByBatch = function(array, batchData) {
        batchData.forEach(item => {
            switch(item.type) {
                case "update": this.updateArrayItem(array, item.key, item.data); break;
                case "insert": this.insertItemToArray(array, item.data); break;
                case "remove": this.removeItemFromArray(array, item.key); break;
            }
        });
    };

    this.updateArrayItem = function(array, key, data, checkErrors) {
        var target,
            extendComplexObject = true;

        if(keyExpr) {
            if(checkErrors && hasKey(data, keyExpr) && !keysEqual(keyExpr, key, keyGetter(data))) {
                return rejectedPromise(errors.Error("E4017"));
            }

            let index = this.indexByKey(array, key);
            if(index < 0) {
                if(checkErrors) {
                    return rejectedPromise(errors.Error("E4009"));
                } else {
                    return trivialPromise(key, data);
                }
            }

            target = array[index];
        } else {
            target = key;
        }

        objectUtils.deepExtendArraySafe(target, data, extendComplexObject);
        return trivialPromise(key, data);
    };

    this.insertItemToArray = function(array, data) {
        var keyValue,
            obj;

        obj = typeUtils.isPlainObject(data) ? extend({}, data) : data;

        if(keyExpr) {
            keyValue = keyGetter(obj);
            if(keyValue === undefined || typeof keyValue === "object" && typeUtils.isEmptyObject(keyValue)) {
                if(Array.isArray(keyExpr)) {
                    throw errors.Error("E4007");
                }
                keyValue = obj[keyExpr] = String(new Guid());
            } else {
                if(array[this.indexByKey(array, keyValue)] !== undefined) {
                    return rejectedPromise(errors.Error("E4008"));
                }
            }
        } else {
            keyValue = obj;
        }

        array.push(obj);
        return trivialPromise(data, keyValue);
    };

    this.removeItemFromArray = function(array, key) {
        var index = this.indexByKey(array, key);
        if(index > -1) {
            array.splice(index, 1);
        }
        return trivialPromise(key);
    };

    this.indexByKey = function(array, key) {
        for(var i = 0, arrayLength = array.length; i < arrayLength; i++) {
            if(keysEqual(keyExpr, keyGetter(array[i]), key)) {
                return i;
            }
        }
        return -1;
    };
}

/**
* @name Utils
*/
var utils = {
    XHR_ERROR_UNLOAD: XHR_ERROR_UNLOAD,

    normalizeBinaryCriterion: normalizeBinaryCriterion,
    normalizeSortingInfo: normalizeSortingInfo,
    errorMessageFromXhr: errorMessageFromXhr,
    aggregators: aggregators,

    keysEqual: keysEqual,
    ArrayHelper: ArrayHelper,
    trivialPromise: trivialPromise,
    rejectedPromise: rejectedPromise,

    isDisjunctiveOperator: isDisjunctiveOperator,
    isConjunctiveOperator: isConjunctiveOperator,

    processRequestResultLock: processRequestResultLock,

    isUnaryOperation: isUnaryOperation,

    /**
    * @name Utils.base64_encode
    * @publicName base64_encode(input)
    * @param1 input:string|Array<number>
    * @return string
    * @namespace DevExpress.data
    * @module data/utils
    * @export base64_encode
    */
    base64_encode: base64_encode
};

module.exports = utils;
