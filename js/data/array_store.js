"use strict";

import { trivialPromise, rejectedPromise, updateArrayItem, indexByKey, insertItemInArray } from "./utils";
import Query from "./query";
import { errors } from "./errors";
import Store from "./abstract_store";

/**
* @name ArrayStore
* @inherits Store
* @type object
* @module data/array_store
* @export default
*/
var ArrayStore = Store.inherit({
    ctor: function(options) {
        if(Array.isArray(options)) {
            options = { data: options };
        } else {
            options = options || {};
        }

        this.callBase(options);

        var initialArray = options.data;
        if(initialArray && !Array.isArray(initialArray)) {
            throw errors.Error("E4006");
        }

        /**
         * @name ArrayStoreOptions.data
         * @type Array<any>
         */
        this._array = initialArray || [];
    },

    /**
    * @name ArrayStoreMethods.createQuery
    * @publicName createQuery()
    * @return object
    */
    createQuery: function() {
        return Query(this._array, {
            errorHandler: this._errorHandler
        });
    },

    _byKeyImpl: function(key) {
        var index = indexByKey(this, this._array, key);

        if(index === -1) {
            return rejectedPromise(errors.Error("E4009"));
        }

        return trivialPromise(this._array[index]);
    },

    _insertImpl: function(values) {
        const checkErrors = true;
        return insertItemInArray(this, this._array, values, checkErrors);
    },

    _notifyBatchImpl: function(batchData) {
        batchData.forEach(item => {
            switch(item.type) {
                case "update": this.update(item.key, item.data); break;
                case "insert": this.insert(item.data); break;
            }
        });
        return trivialPromise();
    },

    _updateImpl: function(key, values) {
        const checkErrors = true;
        return updateArrayItem(this, this._array, key, values, checkErrors);
    },

    _removeImpl: function(key) {
        var index = indexByKey(this, this._array, key);
        if(index > -1) {
            this._array.splice(index, 1);
        }
        return trivialPromise(key);
    },

    /**
    * @name ArrayStoreMethods.clear
    * @publicName clear()
    */
    clear: function() {
        this.fireEvent("modifying");
        this._array = [];
        this.fireEvent("modified");
    }
}, "array");

module.exports = ArrayStore;
