/* import $ from "jquery";
import { DataSource } from "data/data_source/data_source";

import "ui/list";
QUnit.module("live update", {
    beforeEach: function() {
        this.itemRenderedSpy = sinon.spy();
        this.itemDeletedSpy = sinon.spy();
        this.createList = () => {
            var dataSource = new DataSource({
                load: () => [{ a: "Item 0", id: 0 }, { a: "Item 1", id: 1 }],
                key: "id"
            });

            return $("#templated-list").dxList({
                items: dataSource,
                onItemRendered: this.itemRenderedSpy,
                onItemDeleted: this.itemDeletedSpy,
            }).dxList("instance");
        };
    }
}, function() {
    QUnit.test("only updated item is refreshed", function(assert) {
        var store = this.createList().getDataSource.store();
        store.push([{ type: "update", data: { a: "Item 0 Updated", id: 0 }, id: 0 }]);
    });
});
*/
