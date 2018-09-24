import $ from "jquery";
import { DataSource } from "data/data_source/data_source";

import "ui/list";

QUnit.module("live update without grouping", {
    beforeEach: function() {
        this.itemRenderedSpy = sinon.spy();
        this.itemDeletedSpy = sinon.spy();
        this.createList = (dataSourceOptions) => {
            var dataSource = new DataSource($.extend({
                paginate: false,
                load: () => [{ a: "Item 0", id: 0 }, { a: "Item 1", id: 1 }],
                key: "id"
            }, dataSourceOptions));

            return $("#templated-list").dxList({
                dataSource: dataSource,
                onContentReady: (e) => {
                    e.component.option("onItemRendered", this.itemRenderedSpy);
                    e.component.option("onItemDeleted", this.itemDeletedSpy);
                }
            }).dxList("instance");
        };
    }
}, function() {
    QUnit.test("update item", function(assert) {
        var store = this.createList().getDataSource().store();
        var updatedItem = { a: "Item 0 Updated", id: 0 };
        store.push([{ type: "update", data: updatedItem, key: 0 }]);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, updatedItem, "check updated item");
    });

    QUnit.test("add item", function(assert) {
        var store = this.createList().getDataSource().store();
        var insertedItem = { a: "Item 2 Inserted", id: 2 };
        store.push([{ type: "insert", data: insertedItem }]);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, insertedItem, "check added item");
    });

    QUnit.test("remove one item", function(assert) {
        var store = this.createList().getDataSource().store();
        store.push([{ type: "remove", key: 0 }]);

        assert.equal(this.itemRenderedSpy.callCount, 0, "items are not refreshed after remove");
        assert.deepEqual(this.itemDeletedSpy.callCount, 1, "check removed items count");
        assert.deepEqual(this.itemDeletedSpy.firstCall.args[0].itemData.id, 0, "check removed item key");
    });

    QUnit.test("update item when grouping is enabled", function(assert) {
        var store = this.createList({
            load: () => [{ a: "Item 0", id: 0, type: "a" }, { a: "Item 1", id: 1, type: "b" }, { a: "Item 2", id: 0, type: "a" }],
            group: "type"
        }).getDataSource().store();
        var updatedItem = { a: "Item 0 Updated", id: 0, type: "a" };
        store.push([{ type: "update", data: updatedItem, key: 0 }]);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, updatedItem, "check updated item");
    });
});
