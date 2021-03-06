"use strict";

var $ = require("jquery"),
    areaItem = require("./ui.pivot_grid.area_item");

var PIVOTGRID_AREA_CLASS = "dx-pivotgrid-area",
    PIVOTGRID_AREA_DATA_CLASS = "dx-pivotgrid-area-data",
    PIVOTGRID_TOTAL_CLASS = "dx-total",
    PIVOTGRID_GRAND_TOTAL_CLASS = "dx-grandtotal",
    PIVOTGRID_ROW_TOTAL_CLASS = "dx-row-total";

exports.DataArea = areaItem.AreaItem.inherit({
    _getAreaName: function() {
        return "data";
    },
    _createGroupElement: function() {
        return $('<div>')
            .addClass(PIVOTGRID_AREA_CLASS)
            .addClass(PIVOTGRID_AREA_DATA_CLASS);
    },

    _applyCustomStyles: function(options) {
        var cell = options.cell,
            classArray = options.classArray;

        if(cell.rowType === 'T' || cell.columnType === 'T') {
            classArray.push(PIVOTGRID_TOTAL_CLASS);
        }
        if(cell.rowType === 'GT' || cell.columnType === 'GT') {
            classArray.push(PIVOTGRID_GRAND_TOTAL_CLASS);
        }

        if(cell.rowType === 'T' || cell.rowType === 'GT') {
            classArray.push(PIVOTGRID_ROW_TOTAL_CLASS);
        }

        if(options.rowIndex === options.rowsCount - 1) {
            options.cssArray.push('border-bottom: 0px');
        }

        this.callBase(options);
    },

    _moveFakeTable: function(scrollPos) {
        this._moveFakeTableLeft(scrollPos.x);
        this._moveFakeTableTop(scrollPos.y);
        this.callBase();
    },

    processScroll: function(useNativeScrolling) {
        this._groupElement.css('border-top-width', 0)
            .dxScrollable({
                useNative: !!useNativeScrolling,
                useSimulatedScrollbar: !useNativeScrolling,
                direction: "both",
                bounceEnabled: false,
                updateManually: true
            });
    },

    reset: function() {
        this.callBase();
        if(this._virtualContent) {
            this._virtualContent.parent().height("auto");
        }
    },

    setVirtualContentParams: function(params) {
        this.callBase(params);

        this._virtualContent.parent().height(params.height);

        this.tableElement().css({
            top: params.top,
            left: params.left
        });
    }
});
