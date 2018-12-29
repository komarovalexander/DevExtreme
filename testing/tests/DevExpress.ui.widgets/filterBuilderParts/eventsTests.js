import $ from "jquery";
import fields from "../../../helpers/filterBuilderTestData.js";

import {
    FILTER_BUILDER_ITEM_OPERATION_CLASS,
    FILTER_BUILDER_ITEM_VALUE_CLASS,
    FILTER_BUILDER_ITEM_VALUE_TEXT_CLASS
} from "./constants.js";

import {
    clickByButtonAndSelectMenuItem
} from "./helpers.js";

import "ui/filter_builder/filter_builder";

QUnit.module("Events", function() {
    QUnit.test("onEditorPreparing", function(assert) {
        // arrange
        var args,
            spy = sinon.spy(),
            container = $("#container"),
            companyNameValueField;

        container.dxFilterBuilder({
            value: [
                ["CompanyName", "=", "DevExpress"]
            ],
            fields: fields,
            onEditorPreparing: spy
        });

        // act
        companyNameValueField = $("." + FILTER_BUILDER_ITEM_VALUE_CLASS).eq(0);
        companyNameValueField.find("." + FILTER_BUILDER_ITEM_VALUE_TEXT_CLASS).trigger("dxclick");

        // assert
        args = spy.args[0][0];
        assert.strictEqual(spy.callCount, 1, "onEditorPreparing is called");
        assert.strictEqual(args.dataField, "CompanyName", "args -> dataField");
        assert.strictEqual(args.value, "DevExpress", "args -> value");
        assert.strictEqual(args.filterOperation, "=", "args -> filterOperation");
        assert.deepEqual(args.component, container.dxFilterBuilder("instance"), "args -> component");
    });

    QUnit.test("onEditorPreparing for between", function(assert) {
        // arrange
        var spy = sinon.spy(),
            container = $("#container"),
            companyNameValueField;

        container.dxFilterBuilder({
            value: [
                ["Field", "between", [1, 2]]
            ],
            fields: [{
                dataField: "Field",
                dataType: "number"
            }],
            onEditorPreparing: spy
        });

        // act
        companyNameValueField = $("." + FILTER_BUILDER_ITEM_VALUE_CLASS).eq(0);
        companyNameValueField.find("." + FILTER_BUILDER_ITEM_VALUE_TEXT_CLASS).trigger("dxclick");

        // assert
        assert.strictEqual(spy.callCount, 2, "onEditorPreparing is called");

        var startArgs = spy.args[0][0];
        assert.strictEqual(startArgs.value, 1, "args -> value");
        assert.strictEqual(startArgs.filterOperation, "between", "args -> filterOperation");

        var endArgs = spy.args[1][0];
        assert.strictEqual(endArgs.value, 2, "args -> value");
        assert.strictEqual(endArgs.filterOperation, "between", "args -> filterOperation");
    });

    QUnit.test("onEditorPrepared", function(assert) {
        // arrange
        var args,
            spy = sinon.spy(),
            container = $("#container"),
            companyNameValueField;

        container.dxFilterBuilder({
            value: [
                ["CompanyName", "=", "DevExpress"]
            ],
            fields: fields,
            onEditorPrepared: spy
        });

        // act
        companyNameValueField = $("." + FILTER_BUILDER_ITEM_VALUE_CLASS).eq(0);
        companyNameValueField.find("." + FILTER_BUILDER_ITEM_VALUE_TEXT_CLASS).trigger("dxclick");

        // assert
        args = spy.args[0][0];
        assert.strictEqual(spy.callCount, 1, "onEditorPrepared is called");
        assert.strictEqual(args.dataField, "CompanyName", "args -> dataField");
        assert.strictEqual(args.value, "DevExpress", "args -> value");
        assert.strictEqual(args.filterOperation, "=", "args -> filterOperation");
        assert.deepEqual(args.component, container.dxFilterBuilder("instance"), "args -> component");
    });

    QUnit.test("onEditorPrepared for between", function(assert) {
        // arrange
        var spy = sinon.spy(),
            container = $("#container"),
            companyNameValueField;

        container.dxFilterBuilder({
            value: [
                ["Field", "between", [1, 2]]
            ],
            fields: [{
                dataField: "Field",
                dataType: "number"
            }],
            onEditorPrepared: spy
        });

        // act
        companyNameValueField = $("." + FILTER_BUILDER_ITEM_VALUE_CLASS).eq(0);
        companyNameValueField.find("." + FILTER_BUILDER_ITEM_VALUE_TEXT_CLASS).trigger("dxclick");

        // assert
        assert.strictEqual(spy.callCount, 2, "onEditorPrepared is called");

        var startArgs = spy.args[0][0];
        assert.strictEqual(startArgs.value, 1, "args -> value");
        assert.strictEqual(startArgs.filterOperation, "between", "args -> filterOperation");

        var endArgs = spy.args[1][0];
        assert.strictEqual(endArgs.value, 2, "args -> value");
        assert.strictEqual(endArgs.filterOperation, "between", "args -> filterOperation");
    });

    QUnit.test("onValueChanged", function(assert) {
        // arrange
        var args,
            spy = sinon.spy(),
            container = $("#container");

        container.dxFilterBuilder({
            value: ["Zipcode", "=", "666"],
            fields: fields,
            onValueChanged: spy
        });

        // act
        container.dxFilterBuilder("instance").option("value", ["CompanyName", "=", "DevExpress"]);

        // assert
        args = spy.args[0][0];
        assert.strictEqual(spy.callCount, 1, "onValueChanged is called");
        assert.deepEqual(args.previousValue, ["Zipcode", "=", "666"], "previous value");
        assert.deepEqual(args.value, ["CompanyName", "=", "DevExpress"], "current value");
    });

    // T701542
    QUnit.test("Skip onValueChanged after change operation of invalid condition to other invalid condition ", function(assert) {
        // arrange
        var spy = sinon.spy(),
            container = $("#container");

        container.dxFilterBuilder({
            value: ["NumberField", "=", ""],
            fields: fields,
            onValueChanged: spy
        });

        // act
        var $operationButton = container.find("." + FILTER_BUILDER_ITEM_OPERATION_CLASS);
        clickByButtonAndSelectMenuItem($operationButton, 1);
        // assert
        assert.strictEqual(spy.callCount, 0, "onValueChanged is not called"); // operation has invalid condition and before it was invalid

        // act
        var $operationButton = container.find("." + FILTER_BUILDER_ITEM_OPERATION_CLASS);
        clickByButtonAndSelectMenuItem($operationButton, 6);
        // assert
        assert.strictEqual(spy.callCount, 1, "onValueChanged is called"); // isblank has a valid condition

        // act
        var $operationButton = container.find("." + FILTER_BUILDER_ITEM_OPERATION_CLASS);
        clickByButtonAndSelectMenuItem($operationButton, 7);
        // assert
        assert.strictEqual(spy.callCount, 2, "onValueChanged is called"); // is not blank has a valid condition

        // act
        var $operationButton = container.find("." + FILTER_BUILDER_ITEM_OPERATION_CLASS);
        clickByButtonAndSelectMenuItem($operationButton, 1);
        // assert
        assert.strictEqual(spy.callCount, 3, "onValueChanged is called"); // operation has invalid condition but before it was a valid
    });

    QUnit.test("onInitialized", function(assert) {
        assert.expect(1);
        $("#container").dxFilterBuilder({
            value: ["Field", "between", [666, 777]],
            fields: [{
                dataField: "Field",
                dataType: "number"
            }],
            onInitialized: function(e) {
                assert.deepEqual(e.component.getFilterExpression(), [["Field", ">=", 666], "and", ["Field", "<=", 777]]);
            }
        });
    });
});
