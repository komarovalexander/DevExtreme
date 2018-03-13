"use strict";

// there are area, steparea, stackedarea, fullstackedarea, splinearea
var objectUtils = require("../../core/utils/object"),
    extend = require("../../core/utils/extend").extend,
    scatterSeries = require("./scatter_series").chart,
    lineSeries = require("./line_series"),
    chartLineSeries = lineSeries.chart.line,
    polarLineSeries = lineSeries.polar.line,
    _map = require("../core/utils").map,
    _extend = extend,
    calculateBezierPoints = lineSeries.chart["spline"]._calculateBezierPoints;

exports.chart = {};
exports.polar = {};

var baseAreaMethods = {

    _createBorderElement: chartLineSeries._createMainElement,

    _createLegendState: function(styleOptions, defaultColor) {
        return {
            fill: styleOptions.color || defaultColor,
            opacity: styleOptions.opacity,
            hatching: styleOptions.hatching
        };
    },

    getValueRangeInitialValue: function() {
        if(this.valueAxisType !== "logarithmic" && this.valueType !== "datetime" && this.showZero !== false) {
            return 0;
        } else {
            return scatterSeries.getValueRangeInitialValue.call(this);
        }
    },

    _getDefaultSegment: function(segment) {
        var defaultSegment = chartLineSeries._getDefaultSegment(segment);
        defaultSegment.area = defaultSegment.line.concat(defaultSegment.line.slice().reverse());
        return defaultSegment;
    },

    _updateElement: function(element, segment, animate, complete) {
        var lineParams = { points: segment.orderedLine ? segment.orderedLine : segment.line },
            areaParams = { points: segment.orderedArea ? segment.orderedArea : segment.area },
            borderElement = element.line;
        if(animate) {
            borderElement && borderElement.animate(lineParams);
            element.area.animate(areaParams, {}, function() {
                if(segment.orderedArea) {
                    borderElement && borderElement.attr({ points: segment.line });
                    element.area.attr({ points: segment.area });
                }
                complete && complete();
            });
        } else {
            borderElement && borderElement.attr(lineParams);
            element.area.attr(areaParams);
        }
    },

    _removeElement: function(element) {
        element.line && element.line.remove();
        element.area.remove();
    },

    _drawElement: function(segment) {
        return {
            line: this._bordersGroup && this._createBorderElement(segment.line, { "stroke-width": this._styles.normal.border["stroke-width"] }).append(this._bordersGroup),
            area: this._createMainElement(segment.area).append(this._elementsGroup)
        };
    },

    _applyStyle: function(style) {
        var that = this;

        that._elementsGroup && that._elementsGroup.smartAttr(style.elements);
        that._bordersGroup && that._bordersGroup.attr(style.border);
        (that._graphics || []).forEach(function(graphic) {
            graphic.line && graphic.line.attr({ 'stroke-width': style.border["stroke-width"] }).sharp();
        });
    },

    _parseStyle: function(options, defaultColor, defaultBorderColor) {
        var borderOptions = options.border || {},
            borderStyle = chartLineSeries._parseLineOptions(borderOptions, defaultBorderColor);

        borderStyle.stroke = (borderOptions.visible && borderStyle["stroke-width"]) ? borderStyle.stroke : "none";
        borderStyle["stroke-width"] = borderStyle["stroke-width"] || 1;

        return {
            border: borderStyle,
            elements: {
                stroke: "none",
                fill: options.color || defaultColor,
                hatching: options.hatching,
                opacity: options.opacity
            }
        };
    },

    _areBordersVisible: function() {
        var options = this._options;
        return options.border.visible || options.hoverStyle.border.visible || options.selectionStyle.border.visible;
    },

    _createMainElement: function(points, settings) {
        return this._renderer.path(points, "area").attr(settings);
    },

    _getTrackerSettings: function(segment) {
        return { "stroke-width": segment.singlePointSegment ? this._defaultTrackerWidth : 0 };
    },

    _getMainPointsFromSegment: function(segment) {
        return segment.area;
    }
};

function createAreaPoints(points) {
    return _map(points, function(pt) {
        return pt.getCoords();
    }).concat(_map(points.slice().reverse(), function(pt) {
        return pt.getCoords(true);
    }));
}

var areaSeries = exports.chart["area"] = _extend({}, chartLineSeries, baseAreaMethods, {
    _prepareSegment: function(points, orderedPoints, rotated) {
        var processedPoints = this._processSinglePointsAreaSegment(points, rotated),
            processedOrderedPoints = orderedPoints && this._processSinglePointsAreaSegment(orderedPoints, rotated);

        return {
            line: processedPoints,
            orderedLine: processedOrderedPoints,
            orderedArea: orderedPoints && createAreaPoints(processedOrderedPoints),
            area: createAreaPoints(processedPoints),
            singlePointSegment: processedPoints !== points
        };
    },
    _processSinglePointsAreaSegment: function(points, rotated) {
        if(points && points.length === 1) {
            var p = points[0],
                p1 = objectUtils.clone(p);
            p1[rotated ? "y" : "x"] += 1;
            p1.argument = null;
            return [p, p1];
        }
        return points;
    }
});

exports.polar["area"] = _extend({}, polarLineSeries, baseAreaMethods, {
    _prepareSegment: function(points, orderedPoints, rotated, lastSegment) {
        lastSegment && polarLineSeries._closeSegment.call(this, points);

        var preparedPoints = areaSeries._prepareSegment.call(this, points);

        return preparedPoints;
    },
    _processSinglePointsAreaSegment: function(points) {
        return lineSeries.polar.line._prepareSegment.call(this, points).line;
    }
});

exports.chart["steparea"] = _extend({}, areaSeries, {
    _prepareSegment: function(points, orderedPoints, rotated) {
        var stepLineSeries = lineSeries.chart["stepline"];
        points = areaSeries._processSinglePointsAreaSegment(points, rotated);
        orderedPoints = orderedPoints && areaSeries._processSinglePointsAreaSegment(orderedPoints, rotated);
        return areaSeries._prepareSegment.call(this, stepLineSeries._calculateStepLinePoints(points), orderedPoints && stepLineSeries._calculateStepLinePoints(orderedPoints));
    }
});

exports.chart["splinearea"] = _extend({}, areaSeries, {
    _areaPointsToSplineAreaPoints: function(areaPoints) {
        var previousMiddlePoint = areaPoints[areaPoints.length / 2 - 1],
            middlePoint = areaPoints[areaPoints.length / 2];
        areaPoints.splice(areaPoints.length / 2, 0, { x: previousMiddlePoint.x, y: previousMiddlePoint.y }, { x: middlePoint.x, y: middlePoint.y });
        ///#DEBUG
        if(previousMiddlePoint.defaultCoords) {
            areaPoints[areaPoints.length / 2].defaultCoords = true;
        }
        if(middlePoint.defaultCoords) {
            areaPoints[areaPoints.length / 2 - 1].defaultCoords = true;
        }
        ///#ENDDEBUG
    },

    _prepareSegment: function(points, orderedPoints, rotated) {
        var processedPoints = areaSeries._processSinglePointsAreaSegment(points, rotated),
            areaSegment = areaSeries._prepareSegment.call(this, calculateBezierPoints(processedPoints, rotated), orderedPoints && calculateBezierPoints(orderedPoints, rotated));
        this._areaPointsToSplineAreaPoints(areaSegment.area);
        areaSegment.orderedArea && this._areaPointsToSplineAreaPoints(areaSegment.orderedArea);
        areaSegment.singlePointSegment = processedPoints !== points;
        return areaSegment;
    },

    _getDefaultSegment: function(segment) {
        var areaDefaultSegment = areaSeries._getDefaultSegment(segment);
        this._areaPointsToSplineAreaPoints(areaDefaultSegment.area);
        return areaDefaultSegment;
    },

    _createMainElement: function(points, settings) {
        return this._renderer.path(points, "bezierarea").attr(settings);
    },

    _createBorderElement: lineSeries.chart["spline"]._createMainElement
});
