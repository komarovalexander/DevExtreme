var $ = require("../../core/renderer"),
    BaseCollectionWidget = require("./ui.collection_widget.base"),
    extend = require("../../core/utils/extend").extend,
    isDefined = require("../../core/utils/type").isDefined,
    arrayUtils = require("../../data/array_utils"),
    dataUtils = require("../../data/utils"),
    keysEqual = dataUtils.keysEqual,
    deferredUtils = require("../../core/utils/deferred"),
    when = deferredUtils.when,
    findChanges = require("../../core/utils/array_compare").findChanges;

var CollectionWidget = BaseCollectionWidget.inherit({
    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            /**
            * @name CollectionWidgetOptions.repaintChangesOnly
            * @type boolean
            * @hidden
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
        var result = $();
        this.itemElements().each(function(_, item) {
            var $item = $(item);
            if(keysEqual(this.key(), this.keyOf(this._getItemData($item)), key)) {
                result = $item;
                return false;
            }
        }.bind(this));

        return result;
    },

    _partialRefresh: function(newItems) {
        if(this.option("repaintChangesOnly")) {
            var oldItems = this._itemsCache,
                isItemEquals = (item1, item2) => JSON.stringify(item1) === JSON.stringify(item2),
                result = findChanges(oldItems, this._editStrategy.itemsGetter(), this.keyOf.bind(this), isItemEquals);
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
        const items = this._editStrategy.itemsGetter(),
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

module.exports = CollectionWidget;
