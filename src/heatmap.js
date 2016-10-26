/* ****************************************************************************
 * OVERRIDE: dc.heatMap                                                       *
 * ***************************************************************************/
/**
 * A heat map is matrix that represents the values of two dimensions of data using colors.
 * @name heatMap
 * @memberof dc
 * @mixes dc.colorMixin
 * @mixes dc.marginMixin
 * @mixes dc.baseMixin
 * @example
 * // create a heat map under #chart-container1 element using the default global chart group
 * var heatMap1 = dc.heatMap('#chart-container1');
 * // create a heat map under #chart-container2 element using chart group A
 * var heatMap2 = dc.heatMap('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.heatMap}
 */
dc.heatMap = function (parent, chartGroup) {
    var INTERVAL_LABELS = {

      // ISO DOW starts at 1, set null at 0 index
      DAY_OF_WEEK: [
        null, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
      ],

      // Months start at 1, set null at 0 index
      MONTH: [
        null, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],

      HOUR_OF_DAY: [
        '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
        '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
        '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
        '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
      ]

    };

    var DEFAULT_BORDER_RADIUS = 6.75;

    var _chartBody;

    var _cols;
    var _rows;
    var _colOrdering = d3.ascending;
    var _rowOrdering = d3.ascending;
    var _colScale = d3.scale.ordinal();
    var _rowScale = d3.scale.ordinal();

    var _xBorderRadius = DEFAULT_BORDER_RADIUS;
    var _yBorderRadius = DEFAULT_BORDER_RADIUS;

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    var _yLabel;
    var _xLabel;
    var _hasBeenRendered = false;
    var _minBoxSize= 16;
    var _scrollPos = {top: null, left: null};
    var _dockedAxes;
    var _dockedAxesSize = {left: 48, bottom: 56};
/* --------------------------------------------------------------------------*/

    var _xBorderRadius = DEFAULT_BORDER_RADIUS;
    var _yBorderRadius = DEFAULT_BORDER_RADIUS;

    var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
    _chart._mandatoryAttributes(['group']);
    _chart.title(_chart.colorAccessor());

    var _colsLabel = function (d) {
        return d;
    };
    var _rowsLabel = function (d) {
        return d;  
    };

    _chart.dockedAxesSize = function (_) {
        if (!arguments.length) {
            return _dockedAxesSize;
        }
        _dockedAxesSize = _;
        return _chart;
    };

    /**
     * Set or get the column label function. The chart class uses this function to render
     * column labels on the X axis. It is passed the column name.
     * @name colsLabel
     * @memberof dc.heatMap
     * @instance
     * @example
     * // the default label function just returns the name
     * chart.colsLabel(function(d) { return d; });
     * @param  {Function} [labelFunction=function(d) { return d; }]
     * @return {Function}
     * @return {dc.heatMap}
     */
    _chart.colsLabel = function (labelFunction) {
        if (!arguments.length) {
            return _colsLabel;
        }
        _colsLabel = labelFunction;
        return _chart;
    };

    /**
     * Set or get the row label function. The chart class uses this function to render
     * row labels on the Y axis. It is passed the row name.
     * @name rowsLabel
     * @memberof dc.heatMap
     * @instance
     * @example
     * // the default label function just returns the name
     * chart.rowsLabel(function(d) { return d; });
     * @param  {Function} [labelFunction=function(d) { return d; }]
     * @return {Function}
     * @return {dc.heatMap}
     */
    _chart.rowsLabel = function (labelFunction) {
        if (!arguments.length) {
            return _rowsLabel;
        }
        _rowsLabel = labelFunction;
        return _chart;
    };

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    _chart.setLabels = function (xLabel, yLabel) {
        _xLabel = xLabel;
        _yLabel = yLabel;
    }
    var _xAxisOnClick = function (d) {
        filterAxis(0, d);
    };

    var _yAxisOnClick = function (d) {
        filterAxis(1, d);
    };
/* --------------------------------------------------------------------------*/

    var _boxOnClick = function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
        var filter = [d.key0, d.key1];
/* --------------------------------------------------------------------------*/
        _chart.handleFilterClick(d3.event, filter)
    };

    function filterAxis (axis, value) {
        var cellsOnAxis = _chart.selectAll('.box-group').filter(function (d) {

/* OVERRIDE ---------------------------------------------------------------*/
            return (axis === 1 ? _chart.valueAccessor()(d) : _chart.keyAccessor()(d)) === value;
/* --------------------------------------------------------------------------*/

        });

        var unfilteredCellsOnAxis = cellsOnAxis.filter(function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
            return !_chart.hasFilter([d.key0, d.key1]);
/* --------------------------------------------------------------------------*/

        });
        dc.events.trigger(function () {
            if (unfilteredCellsOnAxis.empty()) {
                cellsOnAxis.each(function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
                    _chart.filter([d.key0, d.key1]);
/* --------------------------------------------------------------------------*/

                });
            } else {
                unfilteredCellsOnAxis.each(function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
                    _chart.filter([d.key0, d.key1]);
/* --------------------------------------------------------------------------*/

                });
            }

            _chart.redrawGroup();
        });
    }

    dc.override(_chart, 'filter', function (filter, isInverseFilter) {
        if (!arguments.length) {
            return _chart._filter();
        }

        return _chart._filter(dc.filters.TwoDimensionalFilter(filter), isInverseFilter);
    });

    function uniq (d, i, a) {
        return !i || a[i - 1] !== d;
    }

    /**
     * Gets or sets the values used to create the rows of the heatmap, as an array. By default, all
     * the values will be fetched from the data using the value accessor, and they will be sorted in
     * ascending order.
     * @name rows
     * @memberof dc.heatMap
     * @instance
     * @param  {Array<String|Number>} [rows]
     * @return {Array<String|Number>}
     * @return {dc.heatMap}
     */
    _chart.rows = function (rows) {
        if (arguments.length) {
            _rows = rows;
            return _chart;
        }
            return _rows;
    };

    _chart.rowOrdering = function (_) {
        if (!arguments.length) {
            return _rowOrdering;
        }
        _rowOrdering = _;
        return _chart;
    };

    /**
     * Gets or sets the keys used to create the columns of the heatmap, as an array. By default, all
     * the values will be fetched from the data using the key accessor, and they will be sorted in
     * ascending order.
     * @name cols
     * @memberof dc.heatMap
     * @instance
     * @param  {Array<String|Number>} [cols]
     * @return {Array<String|Number>}
     * @return {dc.heatMap}
     */
    _chart.cols = function (cols) {
        if (arguments.length) {
            _cols = cols;
            return _chart;
        }
        return _cols;
    };

    _chart.colOrdering = function (_) {
        if (!arguments.length) {
            return _colOrdering;
        }
        _colOrdering = _;
        return _chart;
    };

    _chart._doRender = function () {
        _chart.resetSvg();

/* OVERRIDE -----------------------------------------------------------------*/
        _chart.margins({top: 8, right: 16, bottom: 0, left: 0});
/* --------------------------------------------------------------------------*/

        _chartBody = _chart.svg()
            .append('g')
            .attr('class', 'heatmap')
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');

/* OVERRIDE -----------------------------------------------------------------*/
        _chartBody.append('g')
            .attr('class', 'box-wrapper');
        _hasBeenRendered = true;

        _dockedAxes = _chart.root()
          .append('div')
          .attr('class', 'docked-axis-wrapper');
/* --------------------------------------------------------------------------*/
        return _chart._doRedraw();
    };

    _chart._doRedraw = function () {

        if (!_hasBeenRendered)
            return _chart._doRender();

        var data = _chart.data(),
            cols = _chart.cols(),
            rows = _chart.rows() || data.map(_chart.valueAccessor()),
            cols = _chart.cols() || data.map(_chart.keyAccessor());
        if (_rowOrdering) {
            rows = rows.sort(_rowOrdering);
        }
        if (_colOrdering) {
            cols = cols.sort(_colOrdering);
        }
        rows = _rowScale.domain(rows);
        cols = _colScale.domain(cols);

        _chart.dockedAxesSize(_chart.getAxisSizes(cols.domain(), rows.domain()))
        
        var rowCount = rows.domain().length,
            colCount = cols.domain().length,
            availWidth = _chart.width() - _dockedAxesSize.left,
            availHeight = _chart.height() - _dockedAxesSize.bottom,
            boxWidth = Math.max((availWidth - _chart.margins().right) / colCount, _minBoxSize),
            boxHeight = Math.max((availHeight - _chart.margins().top) / rowCount, _minBoxSize),
            svgWidth = boxWidth * colCount + _chart.margins().right,
            svgHeight = boxHeight * rowCount + _chart.margins().top;

        cols.rangeBands([0, boxWidth * colCount]);
        rows.rangeBands([boxHeight * rowCount, 0]);

    
        _chart.svg()
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        var scrollNode = _chart.root()
            .classed('heatmap-scroll', true)
            .select('.svg-wrapper')
            .style('width', _chart.width() - _dockedAxesSize.left + 'px')
            .style('height', _chart.height() - _dockedAxesSize.bottom + 'px')
            .style('left', _dockedAxesSize.left + 'px')
            .on('scroll', function(){
              _scrollPos = {
                top: d3.select(this).node().scrollTop,
                left: d3.select(this).node().scrollLeft
              }
              _chart.root().select('.docked-x-axis')
                .style('left', -_scrollPos.left + 'px');
              _chart.root().select('.docked-y-axis')
                .style('top', -_scrollPos.top + 'px');
            })
            .node();

        scrollNode.scrollLeft = _scrollPos.left ? _scrollPos.left : 0;
        scrollNode.scrollTop = _scrollPos.top || _scrollPos.top === 0 ? _scrollPos.top : svgHeight;

        var boxes = _chartBody.select('.box-wrapper')
          .selectAll('g.box-group')
          .data(_chart.data(), function (d, i) {
            return _chart.keyAccessor()(d, i) + '\0' + _chart.valueAccessor()(d, i);
           });

        var gEnter = boxes.enter().append('g')
            .attr('class', 'box-group');

        gEnter.append('rect')
            .attr('class', 'heat-box')
            .attr('fill', 'white')
            .on('mouseenter', showPopup)
            .on('mousemove', positionPopup)
            .on('mouseleave', hidePopup)
            .on('click', _chart.boxOnClick());

        dc.transition(boxes.select('rect'), _chart.transitionDuration())
            .attr('x', function (d, i) { return cols(_chart.keyAccessor()(d, i)); })
            .attr('y', function (d, i) { return rows(_chart.valueAccessor()(d, i)); })
            .attr('rx', _xBorderRadius)
            .attr('ry', _yBorderRadius)
            .attr('fill', _chart.getColor)
            .attr('width', boxWidth)
            .attr('height', boxHeight);

        boxes.exit().remove();

        var XAxis = _dockedAxes.selectAll('.docked-x-axis');

        if (XAxis.empty()) {
            XAxis = _dockedAxes.append('div')
              .attr('class', 'docked-x-axis');
        }

        var colsText = XAxis
              .style('height', _dockedAxesSize.bottom + 'px')
              .html('')
              .selectAll('div.text')
              .data(cols.domain());

        colsText.enter()
          .append('div')
          .attr('class', function(d) {
            return 'text ' + (_dockedAxesSize.bottom > 52 ? 'rotate-down' : 'center');
          })
          .style('left', function (d) { return cols(d) + (boxWidth / 2) + _dockedAxesSize.left + 'px'; })
          .on('click', _chart.xAxisOnClick())
          .append('span')
          .text(_chart.colsLabel())
          .attr('title', _chart.colsLabel());

        var YAxis = _dockedAxes.selectAll('.docked-y-axis');

        if (YAxis.empty()) {
            YAxis = _dockedAxes.append('div')
              .attr('class', 'docked-y-axis');
        }

        var rowsText = YAxis
                .style('width', _dockedAxesSize.left + 'px')
                .style('left', _dockedAxesSize.left + 'px')
                .html('').selectAll('div.text').data(rows.domain());
        
        rowsText.enter()
          .append('div')
          .attr('class', 'text')
          .style('top', function (d) { return rows(d) + (boxHeight / 2) + _chart.margins().top + 'px'; })
          .on('click', _chart.yAxisOnClick())
          .text(_chart.rowsLabel())
          .attr('title', _chart.rowsLabel());

        var axesMask = _dockedAxes.selectAll('.axes-mask');

        if (axesMask.empty()) {
            axesMask = _dockedAxes.append('div')
              .attr('class', 'axes-mask');
        }

        axesMask
            .style('width', _dockedAxesSize.left + 'px')
            .style('height', _dockedAxesSize.bottom + 'px')

        if (_chart.hasFilter()) {
            _chart.selectAll('g.box-group').each(function (d) {
                if (_chart.isSelectedNode(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll('g.box-group').each(function () {
                _chart.resetHighlight(this);
            });
        }

        _chart.renderAxisLabels();

        return _chart;
    };

    /**
     * Gets or sets the handler that fires when an individual cell is clicked in the heatmap.
     * By default, filtering of the cell will be toggled.
     * @name boxOnClick
     * @memberof dc.heatMap
     * @instance
     * @example
     * // default box on click handler
     * chart.boxOnClick(function (d) {
     *     var filter = d.key;
     *     dc.events.trigger(function () {
     *         _chart.filter(filter);
     *         _chart.redrawGroup();
     *     });
     * });
     * @param  {Function} [handler]
     * @return {Function}
     * @return {dc.heatMap}
     */
    _chart.boxOnClick = function (handler) {
        if (!arguments.length) {
            return _boxOnClick;
        }
        _boxOnClick = handler;
        return _chart;
    };

    /**
     * Gets or sets the handler that fires when a column tick is clicked in the x axis.
     * By default, if any cells in the column are unselected, the whole column will be selected,
     * otherwise the whole column will be unselected.
     * @name xAxisOnClick
     * @memberof dc.heatMap
     * @instance
     * @param  {Function} [handler]
     * @return {Function}
     * @return {dc.heatMap}
     */
    _chart.xAxisOnClick = function (handler) {
        if (!arguments.length) {
            return _xAxisOnClick;
        }
        _xAxisOnClick = handler;
        return _chart;
    };

    /**
     * Gets or sets the handler that fires when a row tick is clicked in the y axis.
     * By default, if any cells in the row are unselected, the whole row will be selected,
     * otherwise the whole row will be unselected.
     * @name yAxisOnClick
     * @memberof dc.heatMap
     * @instance
     * @param  {Function} [handler]
     * @return {Function}
     * @return {dc.heatMap}
     */
    _chart.yAxisOnClick = function (handler) {
        if (!arguments.length) {
            return _yAxisOnClick;
        }
        _yAxisOnClick = handler;
        return _chart;
    };

    /**
     * Gets or sets the X border radius.  Set to 0 to get full rectangles.
     * @name xBorderRadius
     * @memberof dc.heatMap
     * @instance
     * @param  {Number} [xBorderRadius=6.75]
     * @return {Number}
     * @return {dc.heatMap}
     */
    _chart.xBorderRadius = function (xBorderRadius) {
        if (!arguments.length) {
            return _xBorderRadius;
        }
        _xBorderRadius = xBorderRadius;
        return _chart;
    };

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.renderAxisLabels = function () {

        var root = _chart.root();

        var yLabel = root.selectAll('.y-axis-label');

        if (yLabel.empty()) {
            yLabel = root.append('div')
            .attr('class', 'y-axis-label')
            .text(_yLabel);
        }

        yLabel
            .style('top', (_chart.effectiveHeight() / 2 + _chart.margins().top) +'px');

        var xLabel = root.selectAll('.x-axis-label');

        if (xLabel.empty()) {
            xLabel = root.append('div')
            .attr('class', 'x-axis-label')
            .text(_xLabel);
        }

        xLabel
            .style('left', (_chart.effectiveWidth()/2 + _chart.margins().left) +'px');
    };

/* --------------------------------------------------------------------------*/

    /**
     * Gets or sets the Y border radius.  Set to 0 to get full rectangles.
     * @name yBorderRadius
     * @memberof dc.heatMap
     * @instance
     * @param  {Number} [yBorderRadius=6.75]
     * @return {Number}
     * @return {dc.heatMap}
     */
    _chart.yBorderRadius = function (yBorderRadius) {
        if (!arguments.length) {
            return _yBorderRadius;
        }
        _yBorderRadius = yBorderRadius;
        return _chart;
    };

    _chart.isSelectedNode = function (d) {


/* OVERRIDE -----------------------------------------------------------------*/
        return _chart.hasFilter([d.key0, d.key1]) ^ _chart.filtersInverse();
/* --------------------------------------------------------------------------*/

    };

/* OVERRIDE ---------------------------------------------------------------- */
    function showPopup(d, i) {

        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-content').html('')
            .classed('popup-list', true);

        popupBox.append('div')
            .attr('class', 'popup-header')
            .text(function(){
              return _colsLabel(_chart.keyAccessor()(d, i)) + ' x ' + _rowsLabel(_chart.valueAccessor()(d, i));
            });

        var popupItem = popupBox.append('div')
          .attr('class', 'popup-item');


        popupItem.append('div')
            .attr('class', 'popup-legend')
            .style('background-color', _chart.getColor(d, i));

        popupItem.append('div')
            .attr('class', 'popup-item-value')
            .html(function(){
                return dc.utils.formatValue(d.color);
            });

        popup.classed('js-showPopup', true);
    }

    function hidePopup() {
        _chart.popup().classed('js-showPopup', false);
    }

    function positionPopup() {
        var coordinates = [0, 0];
        coordinates = _chart.popupCoordinates(d3.mouse(this));

        var scrollNode = _chart.root().select('.svg-wrapper').node();
        var x = coordinates[0] + _dockedAxesSize.left - scrollNode.scrollLeft;
        var y = coordinates[1] + _chart.margins().top - scrollNode.scrollTop;

        var popup =_chart.popup()
            .attr('style', function(){
                return 'transform:translate('+x+'px,'+y+'px)';
            });

        popup.select('.chart-popup-box')
            .classed('align-right', function(){
                return x + d3.select(this).node().getBoundingClientRect().width > _chart.width();
            });
    }
/* ------------------------------------------------------------------------- */

    return _chart.anchor(parent, chartGroup);
};
/* ****************************************************************************
 * END OVERRIDE: dc.heatMap                                                   *
 * ***************************************************************************/
