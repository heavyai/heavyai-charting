/******************************************************************************
 * OVERRIDE: dc.baseMixin                                                     *
 * ***************************************************************************/
dc.baseMixin = function (_chart) {
    _chart.__dcFlag__ = dc.utils.uniqueId();

    var _dimension;
    var _group;

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.dataCache = null;
/* ------------------------------------------------------------------------- */

    var _anchor;
    var _root;
    var _svg;
    var _isChild;

/* OVERRIDE ---------------------------------------------------------------- */
    var _popup;
    var _redrawBrushFlag = false;
/* ------------------------------------------------------------------------- */

    var _minWidth = 200;
    var _defaultWidth = function (element) {
        var width = element && element.getBoundingClientRect && element.getBoundingClientRect().width;
        return (width && width > _minWidth) ? width : _minWidth;
    };
    var _width = _defaultWidth;

    var _minHeight = 200;
    var _defaultHeight = function (element) {
        var height = element && element.getBoundingClientRect && element.getBoundingClientRect().height;
        return (height && height > _minHeight) ? height : _minHeight;
    };
    var _height = _defaultHeight;

/* OVERRIDE ---------------------------------------------------------------- */
    var _redrawBrushFlag = false;
    var _keyAccessor = dc.pluck('key0');
    var _label = dc.pluck('key0');
    var _ordering = dc.pluck('key0');
    var _measureLabelsOn = false;
/* ------------------------------------------------------------------------- */

    var _valueAccessor = dc.pluck('value');
    var _orderSort;

    var _renderLabel = false;

    var _title = function (d) {
        return _chart.keyAccessor()(d) + ': ' + _chart.valueAccessor()(d);
    };
    var _renderTitle = true;

/* TODO -------------------------------------------------------------------- */ 
    // This was either removed or didn't exist when dc.mapd.js was written.
    var _controlsUseVisibility = true;
/* ------------------------------------------------------------------------- */ 

/* OVERRIDE ---------------------------------------------------------------- */
    var _transitionDuration = 500;
/* ------------------------------------------------------------------------- */

    var _filterPrinter = dc.printers.filters;

    var _mandatoryAttributes = ['dimension', 'group'];

    var _chartGroup = dc.constants.DEFAULT_CHART_GROUP;

    var _listeners = d3.dispatch(
        'preRender',
        'postRender',
        'preRedraw',
        'postRedraw',
        'filtered',
        'zoomed',
        'renderlet',

/* TODO -------------------------------------------------------------------- */ 
        // This was either removed or didn't exist when dc.mapd.js was written.
        'pretransition' );
/* ------------------------------------------------------------------------- */

    var _legend;

/* OVERRIDE ---------------------------------------------------------------- */
    _chart._colorLegend = null;

    var _topQueryCallback = null;
    var queryId = 0;
    var _registerQuery = function(callback) {
        var stackEmpty = _topQueryCallback == null;
        // need to check if max query?
        _topQueryCallback = callback;
        if (stackEmpty)
            _topQueryCallback.func(); 
    }

    var _popQueryStack = function(id) {
        if (_topQueryCallback != null && id == _topQueryCallback.id) 
            _topQueryCallback = null;
        else 
            _topQueryCallback.func(); 
    }

    var _startNextQuery = function() {
        _topQueryCallback.func();
        //var callback = _firstQueryCallback;
        //callback();
    }
    
    // override for count chart
    _chart.isCountChart = function() { return false; } 
/* ------------------------------------------------------------------------- */

    var _filters = [];

/* OVERRIDE ---------------------------------------------------------------- */
    var _softFilterClear = false;
/* ------------------------------------------------------------------------- */

    var _filterHandler = function (dimension, filters) {

/* OVERRIDE ---------------------------------------------------------------- */
        // bail out if we are at crossfilter level - i.e. for data count
        if (dimension.type == 'crossfilter') { 
          return filters;
        }
/* ------------------------------------------------------------------------- */

        if (filters.length === 0) {

/* OVERRIDE ---------------------------------------------------------------- */
            dimension.filterAll(_softFilterClear);

             // this is hacky -
             // we need to get dimension.filter to use dimension as this 
            $(dimension).trigger("filter-clear");
        } else {
            if (_chart.hasOwnProperty('rangeFocused')) {
              dimension.filterMulti(filters, _chart.rangeFocused());
            }
            else {
              dimension.filterMulti(filters);
            }
        
          /*
           * REMOVED * 

            dimension.filterFunction(function (d) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    console.log("the filter is: " + filter);
                    if (filter.isFiltered && filter.isFiltered(d)) { // for range + two-dimensional filters
                        return true;
                    } else if (filter <= d && filter >= d) { // for exact filters
                        return true;
                    }
                }
                return false;
            });
            */
        }

/* ------------------------------------------------------------------------- */

        return filters;
    };

    var _data = function (group) {

/* OVERRIDE ---------------------------------------------------------------- */
        if (_chart.dataCache != null)
            return _chart.dataCache;
/* ------------------------------------------------------------------------- */

        return group.all();
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    var _dataAsync = function(group,callbacks) {
        group.allAsync(callbacks);
    }
/* ------------------------------------------------------------------------- */

    _chart.height = function (height) {
        if (!arguments.length) {
            return _height(_root.node());
        }

        _height = d3.functor(height || _defaultHeight);
        return _chart;
    };

    _chart.width = function (width) {
        if (!arguments.length) {
            return _width(_root.node());
        }
        _width = d3.functor(width || _defaultWidth);
        return _chart;
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.accent = function () {}; //no-op
    _chart.unAccent = function () {}; //no-op
/* ------------------------------------------------------------------------- */


    _chart.minWidth = function (minWidth) {
        if (!arguments.length) {
            return _minWidth;
        }
        _minWidth = minWidth;
        return _chart;
    };

    _chart.minHeight = function (minHeight) {
        if (!arguments.length) {
            return _minHeight;
        }
        _minHeight = minHeight;
        return _chart;
    };

    _chart.dimension = function (dimension) {
        if (!arguments.length) {
            return _dimension;
        }
        _dimension = dimension;
        _chart.expireCache();
        return _chart;
    };

    _chart.data = function (callback) {
        if (!arguments.length) {
            return _data.call(_chart, _group);
        }
        _data = d3.functor(callback);
        _chart.expireCache();
        return _chart;
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.dataAsync = function (callback) {
        return _dataAsync.call(_chart, _group, callback);
    }

    _chart.setDataAsync = function(d) {
        _dataAsync = d;
        return _chart;
    }
/* ------------------------------------------------------------------------- */

    _chart.group = function (group, name) {
        if (!arguments.length) {
            return _group;
        }
        _group = group;
        _chart._groupName = name;
        _chart.expireCache();
        return _chart;
    };

    _chart.ordering = function (orderFunction) {
        if (!arguments.length) {
            return _ordering;
        }
        _ordering = orderFunction;
        _orderSort = crossfilter.quicksort.by(_ordering);
        _chart.expireCache();
        return _chart;
    };

    _chart._computeOrderedGroups = function (data) {
        var dataCopy = data.slice(0);

/* OVERRIDE ---------------------------------------------------------------- */

        // if (dataCopy.length <= 1) {
        //     return dataCopy;
        // }
        //
        // if (!_orderSort) {
        //     _orderSort = crossfilter.quicksort.by(_ordering);
        // }
        //
        // return _orderSort(dataCopy, 0, dataCopy.length);
/* ------------------------------------------------------------------------- */
        return dataCopy;
    };

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.filterAll = function (softFilterClear) {

        if (softFilterClear != undefined && softFilterClear == true) {
          _softFilterClear = true;
        }
        else {
          _softFilterClear = false; 
        }

        return _chart.filter(null);
    };
/* ------------------------------------------------------------------------- */

    _chart.select = function (s) {
        return _root.select(s);
    };

    _chart.selectAll = function (s) {
        return _root ? _root.selectAll(s) : null;
    };

    _chart.anchor = function (parent, chartGroup) {
        if (!arguments.length) {
            return _anchor;
        }
        if (dc.instanceOfChart(parent)) {
            _anchor = parent.anchor();
            _root = parent.root();
            _isChild = true;
        } else if(parent) {
            if(parent.select && parent.classed) { // detect d3 selection
                _anchor = parent.node();
            } else {
                _anchor = parent;
            }
            _root = d3.select(_anchor);
            _root.classed(dc.constants.CHART_CLASS, true);
            dc.registerChart(_chart, chartGroup);
            _isChild = false;
        }
        else {
            throw new dc.errors.BadArgumentException('parent must be defined');
        }
        _chartGroup = chartGroup;
        return _chart;
    };

    _chart.anchorName = function () {
        var a = _chart.anchor();
        if (a && a.id) {
            return a.id;
        }
        if (a && a.replace) {
            return a.replace('#', '');
        }
        return 'dc-chart' + _chart.chartID();
    };

    _chart.root = function (rootElement) {
        if (!arguments.length) {
            return _root;
        }
        _root = rootElement;
        return _chart;
    };

    _chart.svg = function (svgElement) {
        if (!arguments.length) {
            return _svg;
        }
        _svg = svgElement;
        return _chart;
    };

    _chart.resetSvg = function () {
/* OVERRIDE ---------------------------------------------------------------- */
        _chart.select('.svg-wrapper').remove();
/* ------------------------------------------------------------------------- */
        return generateSvg();
    };

    function sizeSvg () {
        if (_svg) {
            _svg
                .attr('width', _chart.width())
                .attr('height', _chart.height());
        }
    }

    function generateSvg () {
/* OVERRIDE ---------------------------------------------------------------- */
        _svg = _chart.root().append('div').attr('class', 'svg-wrapper').append('svg');
/* ------------------------------------------------------------------------- */
        sizeSvg();
        return _svg;
    }

/* OVERRIDE ---------------------------------------------------------------- */
    function sizeRoot () {
        if (_root) {
            _root
                .style('height', _chart.height()+'px');
        }
    }

    _chart.popup = function (popupElement) {
        if (!arguments.length) {
            return _popup;
        }
        _popup = popupElement;
        return _chart;
    };

    _chart.generatePopup = function () {
        _chart.select('.chart-popup').remove();

        _popup = _chart.root().append('div').attr('class', 'chart-popup');

        _popup.append('div').attr('class', 'chart-popup-box');

        return _popup;
    }

    _chart.measureLabelsOn = function (val) {
        if (!arguments.length) {
            return _measureLabelsOn;
        }
        _measureLabelsOn = val;
        return _chart;
    };
/* ------------------------------------------------------------------------- */


    _chart.filterPrinter = function (filterPrinterFunction) {
        if (!arguments.length) {
            return _filterPrinter;
        }
        _filterPrinter = filterPrinterFunction;
        return _chart;
    };

    _chart.controlsUseVisibility = function (useVisibility) {
        if (!arguments.length) {
            return _controlsUseVisibility;
        }
        _controlsUseVisibility = useVisibility;
        return _chart;
    };

    _chart.turnOnControls = function () {
        if (_root) {
            var attribute = _chart.controlsUseVisibility() ? 'visibility' : 'display';
            _chart.selectAll('.reset').style(attribute, null);
            _chart.selectAll('.filter').text(_filterPrinter(_chart.filters())).style(attribute, null);
        }
        return _chart;
    };

    _chart.turnOffControls = function () {
        if (_root) {
            var attribute = _chart.controlsUseVisibility() ? 'visibility' : 'display';
            var value = _chart.controlsUseVisibility() ? 'hidden' : 'none';
            _chart.selectAll('.reset').style(attribute, value);
            _chart.selectAll('.filter').style(attribute, value).text(_chart.filter());
        }
        return _chart;
    };

    _chart.transitionDuration = function (duration) {
        if (!arguments.length) {

/* OVERRIDE ---------------------------------------------------------------- */
            return dc._globalTransitionDuration != null ? dc._globalTransitionDuration : _transitionDuration;
/* ------------------------------------------------------------------------- */

        }
        _transitionDuration = duration;
        return _chart;
    };

    _chart._mandatoryAttributes = function (_) {
        if (!arguments.length) {
            return _mandatoryAttributes;
        }
        _mandatoryAttributes = _;
        return _chart;
    };

    function checkForMandatoryAttributes (a) {
        if (!_chart[a] || !_chart[a]()) {
            throw new dc.errors.InvalidStateException('Mandatory attribute chart.' + a +
                ' is missing on chart[#' + _chart.anchorName() + ']');
        }
    }

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.renderAsync = function(queryGroupId,queryCount) {
        if (dc._refreshDisabled)
            return;
        if (_chart.hasOwnProperty('setSample')) {
            _chart.setSample();
        }
        var id = queryId++;
        var renderCallback = $.proxy(_chart.render,this,id,queryGroupId,queryCount);
        _chart.dataAsync([renderCallback]);
    }
/* ------------------------------------------------------------------------- */

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.render = function (id,queryGroupId,queryCount,data) {

        if (dc._refreshDisabled)
            return;
        _chart.dataCache = data !== undefined ? data : null;

        sizeRoot();
/* ------------------------------------------------------------------------- */

        _listeners.preRender(_chart);

        if (_mandatoryAttributes) {
            _mandatoryAttributes.forEach(checkForMandatoryAttributes);
        }

        var result = _chart._doRender();

        if (_legend) {
            _legend.render();
        }

/* OVERRIDE ---------------------------------------------------------------- */
        if (_chart._colorLegend) {
          _chart._colorLegend.render();
        }

        _chart.generatePopup();
/* ------------------------------------------------------------------------- */

        _chart._activateRenderlets('postRender');

/* OVERRIDE ---------------------------------------------------------------- */
        if (queryGroupId !== undefined) {
            if (++dc._renderCount == queryCount) {
                dc._renderCount = 0;
                dc._globalTransitionDuration = null; // reset to null if was brush
                var stackEmpty = dc._renderIdStack == null || dc._renderIdStack == queryGroupId;
                dc._renderIdStack = null;
                if (!stackEmpty)
                    dc.renderAll();
            }
        }
/* ------------------------------------------------------------------------- */

        return result;
    };

    _chart._activateRenderlets = function (event) {
        _listeners.pretransition(_chart);
        if (_chart.transitionDuration() > 0 && _svg) {
            _svg.transition().duration(_chart.transitionDuration())
                .each('end', function () {
                    _listeners.renderlet(_chart);
                    if (event) {
                        _listeners[event](_chart);
                    }
                });
        } else {
            _listeners.renderlet(_chart);
            if (event) {
                _listeners[event](_chart);
            }
        }
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.redrawAsync = function(queryGroupId,queryCount) {
        if (dc._refreshDisabled)
            return;

        if (_chart.hasOwnProperty('setSample')) {
            _chart.setSample();
        }
        var id = queryId++;
        var redrawCallback = $.proxy(_chart.redraw,this,id,queryGroupId,queryCount);
        _chart.dataAsync([redrawCallback]);
    }
/* ------------------------------------------------------------------------- */

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.redraw = function (id,queryGroupId,queryCount, data) {

        if (dc._refreshDisabled)
            return;
        _chart.dataCache = data !== undefined ? data : null;
/* ------------------------------------------------------------------------- */
        sizeSvg();
        _listeners.preRedraw(_chart);

        var result = _chart._doRedraw();

        if (_legend) {
            _legend.render();
        }

/* OVERRIDE ---------------------------------------------------------------- */
        if (_chart._colorLegend) {
          _chart._colorLegend.render();
        }
/* ------------------------------------------------------------------------- */

        _chart._activateRenderlets('postRedraw');

/* OVERRIDE ---------------------------------------------------------------- */
        if (queryGroupId !== undefined) {

            if (++dc._redrawCount == queryCount) {
                dc._redrawCount = 0;
                dc._globalTransitionDuration = null; // reset to null if was brush
                var stackEmpty = dc._redrawIdStack == null || dc._redrawIdStack == queryGroupId;
                dc._redrawIdStack = null;
                // look at logic here
                if (dc._redrawCallback != null) {
                    var callbackCopy = dc._redrawCallback;
                    dc._redrawCallback = null;
                    callbackCopy();
                }
                else if (!stackEmpty) {
                    dc.redrawAll();
                }
            }
        }
/* ------------------------------------------------------------------------- */

        return result;
    };

    _chart.redrawGroup = function () {
        dc.redrawAll(_chart.chartGroup());
    };

    _chart.renderGroup = function () {
        dc.renderAll(_chart.chartGroup());
    };

    _chart._invokeFilteredListener = function (f) {
        if (f !== undefined) {
            _listeners.filtered(_chart, f);
        }
    };

    _chart._invokeZoomedListener = function () {
        _listeners.zoomed(_chart);
    };

    var _hasFilterHandler = function (filters, filter) {
        if (filter === null || typeof(filter) === 'undefined') {
            return filters.length > 0;
        }
        return filters.some(function (f) {
            return filter <= f && filter >= f;
        });
    };

    _chart.hasFilterHandler = function (hasFilterHandler) {
        if (!arguments.length) {
            return _hasFilterHandler;
        }
        _hasFilterHandler = hasFilterHandler;
        return _chart;
    };

    _chart.hasFilter = function (filter) {
        return _hasFilterHandler(_filters, filter);
    };

    var _removeFilterHandler = function (filters, filter) {
        for (var i = 0; i < filters.length; i++) {
            if (filters[i] <= filter && filters[i] >= filter) {
                filters.splice(i, 1);
                break;
            }
        }
        return filters;
    };

    _chart.removeFilterHandler = function (removeFilterHandler) {
        if (!arguments.length) {
            return _removeFilterHandler;
        }
        _removeFilterHandler = removeFilterHandler;
        return _chart;
    };

    var _addFilterHandler = function (filters, filter) {
        filters.push(filter);
        return filters;
    };

    _chart.addFilterHandler = function (addFilterHandler) {
        if (!arguments.length) {
            return _addFilterHandler;
        }
        _addFilterHandler = addFilterHandler;
        return _chart;
    };

    var _resetFilterHandler = function (filters) {
        return [];
    };

    _chart.resetFilterHandler = function (resetFilterHandler) {
        if (!arguments.length) {
            return _resetFilterHandler;
        }
        _resetFilterHandler = resetFilterHandler;
        return _chart;
    };

    function applyFilters () {
        if (_chart.dimension() && _chart.dimension().filter) {
            var fs = _filterHandler(_chart.dimension(), _filters);
            _filters = fs ? fs : _filters;
        }
    }

    _chart.replaceFilter = function (_) {
        _filters = [];
        _chart.filter(_);
    };

    _chart.filter = function (filter) {
        if (!arguments.length) {
            return _filters.length > 0 ? _filters[0] : null;
        }
        if (filter instanceof Array && filter[0] instanceof Array && !filter.isFiltered) {
            filter[0].forEach(function (d) {
                if (_chart.hasFilter(d)) {
                    _removeFilterHandler(_filters, d);
                } else {
                    _addFilterHandler(_filters, d);
                }
            });
        } else if (filter === null) {
            _filters = _resetFilterHandler(_filters);
        } else {
            if (_chart.hasFilter(filter)) {
                _removeFilterHandler(_filters, filter);
            } else {
                _addFilterHandler(_filters, filter);
            }
        }
        applyFilters();
        _chart._invokeFilteredListener(filter);

        if (_root !== null && _chart.hasFilter()) {
            _chart.turnOnControls();
        } else {
            _chart.turnOffControls();
        }

        return _chart;
    };

    _chart.filters = function () {
        return _filters;
    };

/* OVERRIDE EXTEND --------------------------------------------------------- */
    _chart.accentSelected = function(e) {
        d3.select(e).classed(dc.constants.ACCENT_CLASS, true);
    }

    _chart.unAccentSelected = function(e) {
        d3.select(e).classed(dc.constants.ACCENT_CLASS, false);
    }
/* ------------------------------------------------------------------------- */

    _chart.highlightSelected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, true);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    _chart.fadeDeselected = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, true);
    };

    _chart.resetHighlight = function (e) {
        d3.select(e).classed(dc.constants.SELECTED_CLASS, false);
        d3.select(e).classed(dc.constants.DESELECTED_CLASS, false);
    };

    _chart.onClick = function (datum) {
        var filter = _chart.keyAccessor()(datum);
        dc.events.trigger(function () {
            _chart.filter(filter);
            _chart.redrawGroup();
        });
    };

    _chart.filterHandler = function (filterHandler) {
        if (!arguments.length) {
            return _filterHandler;
        }
        _filterHandler = filterHandler;
        return _chart;
    };

    // abstract function stub
    _chart._doRender = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart._doRedraw = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.legendables = function () {
        // do nothing in base, should be overridden by sub-function
        return [];
    };

    _chart.legendHighlight = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendReset = function () {
        // do nothing in base, should be overridden by sub-function
    };

    _chart.legendToggle = function () {
        // do nothing in base, should be overriden by sub-function
    };

    _chart.isLegendableHidden = function () {
        // do nothing in base, should be overridden by sub-function
        return false;
    };

    _chart.keyAccessor = function (keyAccessor) {
        if (!arguments.length) {
            return _keyAccessor;
        }
        _keyAccessor = keyAccessor;
        return _chart;
    };

    _chart.valueAccessor = function (_) {
        if (!arguments.length) {
            return _valueAccessor;
        }
        _valueAccessor = _;
        return _chart;
    };

    _chart.label = function (labelFunction) {
        if (!arguments.length) {
            return _label;
        }
        _label = labelFunction;
        _renderLabel = true;
        return _chart;
    };

    _chart.renderLabel = function (renderLabel) {
        if (!arguments.length) {
            return _renderLabel;
        }
        _renderLabel = renderLabel;
        return _chart;
    };

    _chart.title = function (titleFunction) {
        if (!arguments.length) {
            return _title;
        }
        _title = titleFunction;
        return _chart;
    };

    _chart.renderTitle = function (renderTitle) {
        if (!arguments.length) {
            return _renderTitle;
        }
        _renderTitle = renderTitle;
        return _chart;
    };

    _chart.renderlet = dc.logger.deprecate(function (renderletFunction) {
        _chart.on('renderlet.' + dc.utils.uniqueId(), renderletFunction);
        return _chart;
    }, 'chart.renderlet has been deprecated.  Please use chart.on("renderlet.<renderletKey>", renderletFunction)');

    _chart.chartGroup = function (chartGroup) {
        if (!arguments.length) {
            return _chartGroup;
        }
        if (!_isChild) {
            dc.deregisterChart(_chart, _chartGroup);
        }
        _chartGroup = chartGroup;
        if (!_isChild) {
            dc.registerChart(_chart, _chartGroup);
        }
        return _chart;
    };

    _chart.expireCache = function () {
        // do nothing in base, should be overridden by sub-function
        return _chart;
    };

    _chart.legend = function (legend) {
        if (!arguments.length) {
            return _legend;
        }
        _legend = legend;
        _legend.parent(_chart);
        return _chart;
    };

    _chart.chartID = function () {
        return _chart.__dcFlag__;
    };

    _chart.options = function (opts) {
        var applyOptions = [
            'anchor',
            'group',
            'xAxisLabel',
            'yAxisLabel',
            'stack',
            'title',
            'point',
            'getColor',
            'overlayGeoJson'
        ];

        for (var o in opts) {
            if (typeof(_chart[o]) === 'function') {
                if (opts[o] instanceof Array && applyOptions.indexOf(o) !== -1) {
                    _chart[o].apply(_chart, opts[o]);
                } else {
                    _chart[o].call(_chart, opts[o]);
                }
            } else {
                dc.logger.debug('Not a valid option setter name: ' + o);
            }
        }
        return _chart;
    };

    _chart.on = function (event, listener) {
        _listeners.on(event, listener);
        return _chart;
    };

    return _chart;
};
/******************************************************************************
 * END OVERRIDE: dc.baseMixin                                                 *
 * ***************************************************************************/

