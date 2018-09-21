/* import $ from "jquery";
import { DataSource } from "data/data_source/data_source";

import "ui/list";
QUnit.module("live update", {
    beforeEach: function() {
        var dataSource = new DataSource({
            load: () => [{ a: "Item 0", id: 0 }, { a: "Item 1", id: 1 }],
            key: "id"
        });

        $("#templated-list").dxList({
            items: dataSource
        });

    }
}, function() {
    QUnit.test("only updated item is refreshed", function(assert) {
        var items = [{ a: 0 }, { a: 1 }];

        var $list = $("#templated-list").dxList({
            items: items
        });

        assert.equal(list.getFlatIndexByItemElement($item.get(0)), 1, "index correct");
        assert.equal(list.getFlatIndexByItemElement($item), 1, "index correct");
    });
});
*/
