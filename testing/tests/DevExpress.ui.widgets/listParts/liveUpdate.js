import $ from "jquery";
import { DataSource } from "data/data_source/data_source";

import "ui/list";

QUnit.module("live update", {
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

        var pushData = [{ type: "update", data: { a: "Item 0 Updated", id: 0 }, key: 0 }];
        store.push(pushData);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, pushData[0].data, "check updated item");
    });

    QUnit.test("add item", function(assert) {
        var store = this.createList().getDataSource().store();

        var pushData = [{ type: "insert", data: { a: "Item 2 Inserted", id: 2 } }];
        store.push(pushData);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, pushData[0].data, "check added item");
    });

    QUnit.test("remove one item", function(assert) {
        var store = this.createList().getDataSource().store();

        var pushData = [{ type: "remove", key: 0 }];
        store.push(pushData);

        assert.equal(this.itemRenderedSpy.callCount, 0, "items are not refreshed after remove");
        assert.deepEqual(this.itemDeletedSpy.callCount, 1, "check removed items count");
        assert.deepEqual(this.itemDeletedSpy.firstCall.args[0].itemData.id, pushData[0].key, "check removed item key");
    });

    QUnit.test("update item when grouping is enabled", function(assert) {
        var store = this.createList({
            load: () => [{
                key: "a",
                items: [{ a: "Item 0", id: 0, type: "a" }, { a: "Item 2", id: 0, type: "a" }]
            }, {
                key: "b",
                items: [{ a: "Item 1", id: 1, type: "b" }]
            }],
            group: "type"
        }).getDataSource().store();

        var pushData = [{ type: "update", data: { a: "Item 0 Updated", id: 0, type: "a" }, key: 0 }];
        store.push(pushData);

        assert.equal(this.itemRenderedSpy.callCount, 1, "only one item is updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, pushData[0].data, "check updated item");
    });

    QUnit.test("update item when paging is enabled", function(assert) {
        var store = this.createList({
            paginate: true,
            pageSize: 2,
            load: (loadOptions) => {
                if(loadOptions.skip > 0) {
                    return [{ a: "Item 2", id: 2 }, { a: "Item 3", id: 3 }];
                }
                return [{ a: "Item 0", id: 0 }, { a: "Item 1", id: 1 }];
            }
        }).getDataSource().store();

        var $moreButton = $("#templated-list .dx-list-next-button > .dx-button").eq(0);
        $moreButton.trigger("dxclick");

        this.itemRenderedSpy.reset();
        var pushData = [
            { type: "update", data: { a: "Item 0 Updated", id: 0 }, key: 0 },
            { type: "update", data: { a: "Item 2 Updated", id: 2 }, key: 2 },
        ];
        store.push(pushData);

        assert.equal(this.itemRenderedSpy.callCount, 2, "items from different pages are updated after push");
        assert.deepEqual(this.itemRenderedSpy.firstCall.args[0].itemData, pushData[0].data, "check first updated item");
        assert.deepEqual(this.itemRenderedSpy.lastCall.args[0].itemData, pushData[1].data, "check last updated item");
    });
});
