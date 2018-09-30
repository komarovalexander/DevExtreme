import $ from "../../core/renderer";
import CollectionWidget from "./ui.collection_widget.edit";
import { extend } from "../../core/utils/extend";
import { isDefined } from "../../core/utils/type";
import arrayUtils from "../../data/array_utils";
import { keysEqual } from "../../data/utils";
import { when } from "../../core/utils/deferred";
import { findChanges } from "../../core/utils/array_compare";

const CollectionWidgetLiveUpdate = CollectionWidget.inherit({
    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            /**
            * @name CollectionWidgetOptions.repaintChangesOnly
            * @type boolean
            */
            repaintChangesOnly: false
        });
    },

    ctor: function() {
        this.callBase.apply(this, arguments);

        this._customizeStoreLoadOptions = (e) => {
            if(this._correctionIndex && e.storeLoadOptions) {
                e.storeLoadOptions.skip += this._correctionIndex;
            }
        },

        this._dataSource && this._dataSource.on("customizeStoreLoadOptions", this._customizeStoreLoadOptions);
    },

    _init: function() {
        this.callBase();
        this._refreshItemsCache();
    },

    _findItemElementByKey: function(key) {
        let result = $();
        this.itemElements().each((_, item) => {
            if(keysEqual(this.key(), this.keyOf(this._getItemData(item)), key)) {
                result = item;
                return false;
            }
        });
        return result;
    },

    _dataSourceChangedHandler: function(newItems, e) {
        e && e.changes ? this._modifyByChanges(e.changes) : this.callBase(newItems, e);
    },

    _partialRefresh: function() {
        if(this.option("repaintChangesOnly")) {
            let isItemEquals = (item1, item2) => JSON.stringify(item1) === JSON.stringify(item2),
                result = findChanges(this._itemsCache, this._editStrategy.itemsGetter(), this.keyOf.bind(this), isItemEquals);
            if(result) {
                this._modifyByChanges(result, true);
                return true;
            } else {
                this._refreshItemsCache();
            }
        }
        return false;
    },

    _refreshItemsCache: function() {
        if(this.option("repaintChangesOnly")) {
            this._itemsCache = extend(true, [], this._editStrategy.itemsGetter());
        }
    },

    _dispose: function() {
        this._dataSource && this._dataSource.off("customizeStoreLoadOptions", this._customizeStoreLoadOptions);
        this.callBase();
    },

    _correctionIndex: 0,

    _updateByChange: function(keyInfo, items, change, isPartialRefresh) {
        if(isPartialRefresh) {
            this._renderItem(change.index, change.data, null, this._findItemElementByKey(change.key));
        } else {
            let changedItem = items[arrayUtils.indexByKey(keyInfo, items, change.key)];
            if(changedItem) {
                arrayUtils.update(keyInfo, items, change.key, change.data).done(() => {
                    this._renderItem(items.indexOf(changedItem), changedItem, null, this._findItemElementByKey(change.key));
                });
            }
        }
    },

    _insertByChange: function(keyInfo, items, change, isPartialRefresh) {
        when(isPartialRefresh || arrayUtils.insert(keyInfo, items, change.data, change.index)).done(() => {
            this._renderItem(isDefined(change.index) ? change.index : items.length, change.data);
            this._correctionIndex++;
        });
    },

    _removeByChange: function(keyInfo, items, change, isPartialRefresh) {
        let index = isPartialRefresh ? change.index : arrayUtils.indexByKey(keyInfo, items, change.key),
            removedItem = isPartialRefresh ? change.oldItem : items[index];
        if(removedItem) {
            let key = change.key,
                $removedItemElement = this._findItemElementByKey(key),
                deletedActionArgs = this._extendActionArgs($removedItemElement);
            when(isPartialRefresh || arrayUtils.remove(keyInfo, items, key)).done(() => {
                this._deleteItemElement($removedItemElement, deletedActionArgs, index);
                this._correctionIndex--;
            });
        }
    },

    _modifyByChanges: function(changes, isPartialRefresh) {
        let items = this._editStrategy.itemsGetter(),
            keyInfo = { key: this.key.bind(this), keyOf: this.keyOf.bind(this) };
        changes.forEach(change => this[`_${change.type}ByChange`](keyInfo, items, change, isPartialRefresh));
        this._renderedItemsCount = items.length;
        this._refreshItemsCache();
    },

    _optionChanged: function(args) {
        switch(args.name) {
            case "items":
                var isItemsUpdated = this._partialRefresh(args.value);
                if(!isItemsUpdated) {
                    this.callBase(args);
                }
                break;
            case "dataSource":
                if(!this.option("repaintChangesOnly") || !args.value) {
                    this.option("items", []);
                }

                this.callBase(args);
                break;
            case "repaintChangesOnly":
                break;
            default:
                this.callBase(args);
        }
    }
});

export default CollectionWidgetLiveUpdate;
