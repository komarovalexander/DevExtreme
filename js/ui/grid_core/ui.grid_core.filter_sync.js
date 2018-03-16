"use strict";

var modules = require("./ui.grid_core.modules"),
    utils = require("../filter_builder/utils"),
    gridCoreUtils = require("./ui.grid_core.utils");

var FILTER_ROW_OPERATIONS = ["=", "<>", "<", "<=", ">", ">=", "notcontains", "contains", "startswith", "endswith", "between"],
    HEADER_FILTER_OPERATIONS = ["anyof"];

var FilterSyncController = modules.Controller.inherit((function() {
    var setHeaderFilterValue = function(columnsController, column, headerFilterValue) {
        if(headerFilterValue) {
            if(headerFilterValue[0] === "!") {
                columnsController.columnOption(column.dataField, {
                    filterType: "exclude",
                    filterValues: headerFilterValue[1]
                });
            } else {
                columnsController.columnOption(column.dataField, {
                    filterType: "include",
                    filterValues: headerFilterValue
                });
            }
        }
    };

    var clearHeaderFilterValues = function(columnsController, column) {
        columnsController.columnOption(column.dataField, {
            filterType: "include",
            filterValues: undefined
        });
    };

    var setFilterRowCondition = function(columnsController, column, filterValue, selectedFilterOperation) {
        columnsController.columnOption(column.dataField, {
            filterValue: filterValue,
            selectedFilterOperation: selectedFilterOperation
        });
    };

    var clearFilterRowCondition = function(columnsController, column) {
        columnsController.columnOption(column.dataField, {
            filterValue: undefined,
            selectedFilterOperation: undefined
        });
    };

    return {
        syncFilterValue: function(isInit) {
            var that = this,
                columnsController = that.getController("columns"),
                columns = columnsController.getColumns(),
                filterValue = that.option("filterValue");

            columns.forEach(function(column) {
                var headerFilterCondition = utils.getMatchedCondition(filterValue, column.dataField, HEADER_FILTER_OPERATIONS);
                if(headerFilterCondition) {
                    setHeaderFilterValue(columnsController, column, headerFilterCondition[2]);
                } else if(column.filterValues && !isInit) {
                    clearHeaderFilterValues(columnsController, column);
                }

                var filterRowCondition = utils.getMatchedCondition(filterValue, column.dataField, FILTER_ROW_OPERATIONS);
                if(filterRowCondition) {
                    setFilterRowCondition(columnsController, column, filterRowCondition[2], filterRowCondition[1]);
                } else if(column.filterValue && !isInit) {
                    clearFilterRowCondition(columnsController, column);
                }

                if(column.filterValues && !headerFilterCondition) {
                    filterValue = that._getSyncHeaderFilter(filterValue, column);
                }

                if(column.filterValue && !filterRowCondition) {
                    filterValue = that._getSyncFilterRow(filterValue, column, column.filterValue);
                }
            });

            if(filterValue && filterValue.length > 0) {
                that._setFilterValue(filterValue);
            }
        },

        init: function() {
            if(this.option("filterSyncEnabled")) {
                this.syncFilterValue(true);
            }
        },

        _setFilterValue: function(filterValue) {
            this.skipSyncFilterValue = true;
            this.option("filterValue", filterValue);
            this.skipSyncFilterValue = false;
        },

        _getSyncFilterRow: function(filterValue, column, value) {
            var operation = column.selectedFilterOperation || column.defaultFilterOperation || utils.getDefaultOperation(column),
                filter = [column.dataField, operation, value || null];
            return utils.syncFilters(filterValue, filter, FILTER_ROW_OPERATIONS);
        },

        _getSyncHeaderFilter: function(filterValue, column) {
            var filterValues = column.filterValues,
                filter = [column.dataField];
            if(filterValues) {
                filter.push("anyof");
                filter.push(filterValues);
            } else {
                filter.push("=");
                filter.push(null);
            }
            return utils.syncFilters(filterValue, filter, ["anyof"]);
        },

        syncFilterRow: function(column, value) {
            this._setFilterValue(this._getSyncFilterRow(this.option("filterValue"), column, value));
        },

        syncHeaderFilter: function(column) {
            this._setFilterValue(this._getSyncHeaderFilter(this.option("filterValue"), column));
        },
    };
})());

function anyOf(field, filterValue) {
    var result = [],
        isExclude = field.filterType === "exclude",
        lastIndex = filterValue.length - 1;
    filterValue.forEach(function(value, index) {
        if(utils.isCondition(value) || utils.isGroup(value)) {
            var filterExpression = utils.getFilterExpression(value, [field], [], "headerFilter");
            result.push(isExclude ? ["!", filterExpression] : filterExpression);
        } else {
            result.push(utils.getFilterExpression([field.dataField, isExclude ? "<>" : "=", value], [field], [], "headerFilter"));
        }
        index !== lastIndex && result.push(isExclude ? "and" : "or");
    });
    if(result.length === 1) {
        result = result[0];
    }
    return result;
}

var DataControllerFilterSyncExtender = {
    _needCalculateColumnsFilters: function() {
        return !this.option("filterSyncEnabled");
    },

    _calculateAdditionalFilter: function() {
        var that = this,
            filters = [that.callBase()],
            columns = that.getController("columns").getColumns(),
            filterValue = this.option("filterValue"),
            calculatedFilterValue = utils.getFilterExpression(filterValue, columns, [{
                name: "anyof",
                calculateFilterExpression: function(filterValue, field) {
                    if(filterValue && filterValue.length > 0) {
                        return anyOf(field, filterValue);
                    }
                }
            }], "filterBuilder");

        if(calculatedFilterValue) {
            filters.push(calculatedFilterValue);
        }

        return gridCoreUtils.combineFilters(filters);
    },

    _parseColumnInfo: function(fullName) {
        var matched = fullName.match(/columns\[([0-9]*)\]\.(.*)/);
        return {
            index: matched[1],
            changedField: matched[2]
        };
    },

    optionChanged: function(args) {
        switch(args.name) {
            case "filterValue":
                this._applyFilter();
                var filterSyncController = this.getController("filterSync");
                if(!filterSyncController.skipSyncFilterValue && this.option("filterSyncEnabled")) {
                    filterSyncController.syncFilterValue();
                }
                args.handled = true;
                break;
            case "filterSyncEnabled":
                args.handled = true;
                break;
            case "columns":
                if(this.option("filterSyncEnabled")) {
                    var columnInfo = this._parseColumnInfo(args.fullName),
                        column;
                    if(["filterValues", "filterType"].indexOf(columnInfo.changedField) !== -1) {
                        column = this.getController("columns").getColumns()[columnInfo.index];
                        this.getController("filterSync").syncHeaderFilter(column);
                    } else if(["filterValue", "selectedFilterOperation"].indexOf(columnInfo.changedField) !== -1) {
                        column = this.getController("columns").getColumns()[columnInfo.index];
                        this.getController("filterSync").syncFilterRow(column, column.filterValue);
                    }
                }
                break;
            default:
                this.callBase(args);
        }
    }
};

var ColumnHeadersViewFilterSyncExtender = {
    _isHeaderFilterEmpty: function(column) {
        if(this.option("filterSyncEnabled")) {
            return !utils.filterHasField(this.option("filterValue"), column.dataField);
        }

        return this.callBase(column);
    },

    _needUpdateFilterIndicators: function() {
        return !this.option("filterSyncEnabled");
    },

    optionChanged: function(args) {
        if(args.name === "filterValue") {
            this._updateHeaderFilterIndicators();
        } else {
            this.callBase(args);
        }
    },
};

module.exports = {
    defaultOptions: function() {
        return {
            /**
             * @name GridBaseOptions_filterValue
             * @publicName filterValue
             * @type Filter expression
             * @default null
             */
            filterValue: null,

            /**
             * @name GridBaseOptions_filterSyncEnabled
             * @publicName filterSyncEnabled
             * @type boolean
             * @default false
             */
            filterSyncEnabled: false
        };
    },
    controllers: {
        filterSync: FilterSyncController
    },
    extenders: {
        controllers: {
            data: DataControllerFilterSyncExtender
        },
        views: {
            columnHeadersView: ColumnHeadersViewFilterSyncExtender,
        }
    }
};
