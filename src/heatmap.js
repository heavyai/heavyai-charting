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
    var _numFormat = d3.format(".2s");
    var _hasBeenRendered = false;
/* --------------------------------------------------------------------------*/

    var _xBorderRadius = DEFAULT_BORDER_RADIUS;
    var _yBorderRadius = DEFAULT_BORDER_RADIUS;

    var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
    _chart._mandatoryAttributes(['group']);
    _chart.title(_chart.colorAccessor());

    var _colsLabel = function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
        if(_xLabel.toLowerCase().indexOf('year')){
            return d;
        }
        return isNaN(d) ? d : (_numFormat(d).match(/[a-z]/i) ? _numFormat(d) : parseFloat(_numFormat(d)));
/* --------------------------------------------------------------------------*/

    };
    var _rowsLabel = function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
        if(_yLabel.toLowerCase().indexOf('year')){
            return d;
        }
        return isNaN(d) ? d : (_numFormat(d).match(/[a-z]/i) ? _numFormat(d) : parseFloat(_numFormat(d)));
/* --------------------------------------------------------------------------*/

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
        var dayOfWeek = INTERVAL_LABELS.DAY_OF_WEEK.indexOf(d);
        var month = INTERVAL_LABELS.MONTH.indexOf(d);
        var hourOfDay = INTERVAL_LABELS.HOUR_OF_DAY.indexOf(d);

        if(dayOfWeek > -1) filterAxis(0, dayOfWeek);
        else if(month > -1) filterAxis(0, month);
        else if(hourOfDay > -1) filterAxis(0, hourOfDay);
        else filterAxis(0, d);
    };

    var _yAxisOnClick = function (d) {
        var dayOfWeek = INTERVAL_LABELS.DAY_OF_WEEK.indexOf(d);
        var month = INTERVAL_LABELS.MONTH.indexOf(d);
        var hourOfDay = INTERVAL_LABELS.HOUR_OF_DAY.indexOf(d);

        if(dayOfWeek > -1) filterAxis(1, dayOfWeek);
        else if(month > -1) filterAxis(1, month);
        else if(hourOfDay > -1) filterAxis(1, hourOfDay);
        else filterAxis(1, d);
    };    
/* --------------------------------------------------------------------------*/

    var _boxOnClick = function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
        var filter = [d.key0, d.key1];
/* --------------------------------------------------------------------------*/

        dc.events.trigger(function () {
            _chart.filter(filter);
            _chart.redrawGroup();
        });
    };

    function filterAxis (axis, value) {
        var cellsOnAxis = _chart.selectAll('.box-group').filter(function (d) {

/* OVERRIDE -----------------------------------------------------------------*/
            var keyName = "key" + axis;
            return d[keyName] === value;
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

    dc.override(_chart, 'filter', function (filter) {
        if (!arguments.length) {
            return _chart._filter();
        }

        return _chart._filter(dc.filters.TwoDimensionalFilter(filter));
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
        // if (_rows) {
            return _rows;
        // }
        // var rowValues = _chart.data().map(_chart.valueAccessor());
        // rowValues.sort(d3.ascending);
        // return d3.scale.ordinal().domain(rowValues.filter(uniq));
    };

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.rowOrdering = function (_) {
        if (!arguments.length) {
            return _rowOrdering;
        }
        _rowOrdering = _;
        return _chart;
    };
/* --------------------------------------------------------------------------*/

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
        // if (_cols) {
            return _cols;
        // }
        // var colValues = _chart.data().map(_chart.keyAccessor());
        // colValues.sort(d3.ascending);
        // return d3.scale.ordinal().domain(colValues.filter(uniq));
    };

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.colOrdering = function (_) {
        if (!arguments.length) {
            return _colOrdering;
        }
        _colOrdering = _;
        return _chart;
    };
/* --------------------------------------------------------------------------*/

    _chart._doRender = function () {
        _chart.resetSvg();

/* OVERRIDE -----------------------------------------------------------------*/
        _chart.margins({top: 8, right: 16, bottom: 56, left: 48});
/* --------------------------------------------------------------------------*/

        _chartBody = _chart.svg()
            .append('g')
            .attr('class', 'heatmap')
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');

/* OVERRIDE -----------------------------------------------------------------*/
        _chartBody.append('g')
            .attr('class', 'box-wrapper');
        _hasBeenRendered = true;
/* --------------------------------------------------------------------------*/

        return _chart._doRedraw();
    };

    _chart._doRedraw = function () {

/* OVERRIDE -----------------------------------------------------------------*/
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

        var rowCount = rows.domain().length,
            colCount = cols.domain().length,
/* --------------------------------------------------------------------------*/

            boxWidth = Math.floor(_chart.effectiveWidth() / colCount),
            boxHeight = Math.floor(_chart.effectiveHeight() / rowCount);

        cols.rangeRoundBands([0, _chart.effectiveWidth()]);
        rows.rangeRoundBands([_chart.effectiveHeight(), 0]);

/* OVERRIDE -----------------------------------------------------------------*/
        var boxes = _chartBody.select('.box-wrapper')
          .selectAll('g.box-group')
          .data(_chart.data(), function (d, i) {
            return _chart.keyAccessor()(d, i) + '\0' + _chart.valueAccessor()(d, i);
           });
/* --------------------------------------------------------------------------*/

        var gEnter = boxes.enter().append('g')
            .attr('class', 'box-group');

        gEnter.append('rect')
            .attr('class', 'heat-box')
            .attr('fill', 'white')
            .on('click', _chart.boxOnClick());

/* OVERRIDE -----------------------------------------------------------------*/
        if (_chart.renderTitle()) {
            gEnter.append('title')
                .text(_chart.title());
        }
/* --------------------------------------------------------------------------*/

/* OVERRIDE -----------------------------------------------------------------*/
        dc.transition(boxes.select('rect'), _chart.transitionDuration())
/* --------------------------------------------------------------------------*/

            .attr('x', function (d, i) { return cols(_chart.keyAccessor()(d, i)); })
            .attr('y', function (d, i) { return rows(_chart.valueAccessor()(d, i)); })
            .attr('rx', _xBorderRadius)
            .attr('ry', _yBorderRadius)
            .attr('fill', _chart.getColor)
            .attr('width', boxWidth)
            .attr('height', boxHeight);

        boxes.exit().remove();

        var gCols = _chartBody.selectAll('g.cols');
        if (gCols.empty()) {
            gCols = _chartBody.append('g').attr('class', 'cols axis');
        }

/* OVERRIDE -----------------------------------------------------------------*/
        var maxDomainCharLength = function() {
            var maxChar = 0;
            cols.domain().forEach(function(d){
                maxChar = d.toString().length > maxChar ? d.toString().length : maxChar;
            });
            return maxChar;
        }
        var isRotateLabels = maxDomainCharLength() * 8 > boxWidth ? true : false;
/* --------------------------------------------------------------------------*/

        var gColsText = gCols.selectAll('text').data(cols.domain());
        gColsText.enter().append('text')
              .attr('x', function (d) { return cols(d) + boxWidth / 2; })
              .attr('y', _chart.effectiveHeight())
              .on('click', _chart.xAxisOnClick())
              .text(_chart.colsLabel())
              
/* OVERRIDE -----------------------------------------------------------------*/
              .style('text-anchor', function(d){
                    return isRotateLabels ? (isNaN(d) ?'start' : 'end'): 'middle';
              })
              .attr('dy', (isRotateLabels ? 3 : 12))
              .attr('dx', function(d){
                    return isRotateLabels ? (isNaN(d) ? 2: -4): 0;
              })
              .attr('transform', function(d){
                    return  isRotateLabels ? 'rotate(-90, '+ (cols(d) + boxWidth / 2) +', '+ _chart.effectiveHeight() +')' : null;
               });
/* --------------------------------------------------------------------------*/

        dc.transition(gColsText, _chart.transitionDuration())
               .text(_chart.colsLabel())
               .attr('x', function (d) { return cols(d) + boxWidth / 2; })
               .attr('y', _chart.effectiveHeight())

/* OVERRIDE -----------------------------------------------------------------*/
               .style('text-anchor', function(d){
                    return isRotateLabels ? (isNaN(d) ?'start' : 'end'): 'middle';
               })
               .attr('dy', (isRotateLabels ? 3 : 12))
               .attr('dx', function(d){
                    return isRotateLabels ? (isNaN(d) ? 2: -4): 0;
               })
               .attr('transform', function(d){
                    return  isRotateLabels ? 'rotate(-90, '+ (cols(d) + boxWidth / 2) +', '+ _chart.effectiveHeight() +')' : null;
               });
/* --------------------------------------------------------------------------*/

        gColsText.exit().remove();
        var gRows = _chartBody.selectAll('g.rows');
        if (gRows.empty()) {
            gRows = _chartBody.append('g').attr('class', 'rows axis');
        }
        var gRowsText = gRows.selectAll('text').data(rows.domain());
        gRowsText.enter().append('text')
              .attr('dy', 6)
              .style('text-anchor', 'end')
              .attr('x', 0)
              .attr('dx', -2)
              .on('click', _chart.yAxisOnClick())
              .text(_chart.rowsLabel());
        dc.transition(gRowsText, _chart.transitionDuration())
              .text(_chart.rowsLabel())
              .attr('y', function (d) { return rows(d) + boxHeight / 2; });
        gRowsText.exit().remove();

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

/* OVERRIDE -----------------------------------------------------------------*/
        _chart.renderAxisLabels();
/* --------------------------------------------------------------------------*/

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
        return _chart.hasFilter([d.key0, d.key1]);
/* --------------------------------------------------------------------------*/

    };

    return _chart.anchor(parent, chartGroup);
};
