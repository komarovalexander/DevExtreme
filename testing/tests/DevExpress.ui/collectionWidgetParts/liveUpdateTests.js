import $ from "jquery";
import CollectionWidget from "ui/collection/ui.collection_widget.live_update";
import { DataSource } from "data/data_source/data_source";

function generateData(count) {
    let items = [];
    for(let i = 0; i < count; i++) {
        items.push({ id: i, text: "text " + i });
    }
    return items;
};

const TestComponent = CollectionWidget.inherit({

    NAME: "TestComponent",

    _activeStateUnit: ".item",

    _itemClass: () => "item",

    _itemDataKey: () => "123",

    _itemContainer() {
        return this.$element();
    },

    _shouldAppendItems: () => true,

    loadNextPage() {
        const dataSource = this._dataSource;
        dataSource.pageIndex(1 + dataSource.pageIndex());
        dataSource.load();
    }

});

export const run = function() {
    QUnit.module("live update", {
        beforeEach: function() {
            this.$element = $("#cmp");
            this.data = generateData(10);
            this.items = () => this.instance.option("items");
            this.onCustomizeStoreLoadOptionsSpy = sinon.spy();
            this.instance = new TestComponent(this.$element, {
                dataSource: new DataSource({
                    load: (e) => this.data,
                    loadMode: "raw",
                    pageSize: 2,
                    pushAggregationTimeout: 0,
                    onCustomizeStoreLoadOptions: this.onCustomizeStoreLoadOptionsSpy,
                    key: "id"
                })
            });
            this.store = this.instance.getDataSource().store();
        }
    }, function() {
        QUnit.test("check load next page", function(assert) {
            assert.equal(this.items().length, 2);
            this.instance.loadNextPage();
            assert.equal(this.items()[2], this.data[2]);
            assert.equal(this.items().length, 4);
        });

        QUnit.test("correct index after push insert", function(assert) {
            this.store.push([{ type: "insert", data: { id: 200, text: "text " + 200 }, index: 0 }]);
            this.instance.loadNextPage();
            assert.equal(this.items().length, 5);
            assert.equal(this.items()[0].id, 200);
            assert.equal(this.items()[4].id, 3);
        });
    });
};
