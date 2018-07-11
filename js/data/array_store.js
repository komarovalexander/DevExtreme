"use strict";

import { extend } from "../core/utils/extend";
import typeUtils from "../core/utils/type";
import Guid from "../core/guid";
import { trivialPromise, rejectedPromise, updateArrayItem, indexByKey } from "./utils";
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
        var keyExpr = this.key(),
            keyValue,
            obj;

        if(typeUtils.isPlainObject(values)) {
            obj = extend({}, values);
        } else {
            obj = values;
        }

        if(keyExpr) {
            keyValue = this.keyOf(obj);
            if(keyValue === undefined || typeof keyValue === "object" && typeUtils.isEmptyObject(keyValue)) {
                if(Array.isArray(keyExpr)) {
                    throw errors.Error("E4007");
                }
                keyValue = obj[keyExpr] = String(new Guid());
            } else {
                if(this._array[indexByKey(this, this._array, keyValue)] !== undefined) {
                    return rejectedPromise(errors.Error("E4008"));
                }
            }
        } else {
            keyValue = obj;
        }

        this._array.push(obj);
        return trivialPromise(values, keyValue);
    },

    _notifyBatchImpl: function(batchData) {
        batchData.forEach(item => {
            switch(item.type) {
                case "update": this.update(item.key, item.data); break;
            }
        });
        return trivialPromise(this._array, batchData);
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
