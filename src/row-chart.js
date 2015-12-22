/**
 * Concrete row chart implementation.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * @name rowChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.marginMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a row chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.rowChart('#chart-container1');
 * // create a row chart under #chart-container2 element using chart group A
 * var chart2 = dc.rowChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.rowChart}
 */
dc.rowChart = function (parent, chartGroup) {

    var _g;

    var _labelOffsetX = 8;
    var _labelOffsetY = 16;
    var _hasLabelOffsetY = false;
    var _dyOffset = '0.35em';  // this helps center labels https://github.com/mbostock/d3/wiki/SVG-Shapes#svg_text
    var _titleLabelOffsetX = 2;

/* OVERRIDE -----------------------------------------------------------------*/
    var _xAxisLabel;
    var _yAxisLabel;
    var _autoScroll = false;
    var _minBarHeight= 16;
    var _isBigBar = false;
/* --------------------------------------------------------------------------*/

    var _gap = 4;

    var _fixedBarHeight = false;
    var _rowCssClass = 'row';
    var _titleRowCssClass = 'titlerow';
    var _renderTitleLabel = false;

    var _chart = dc.capMixin(dc.marginMixin(dc.colorMixin(dc.baseMixin({}))));

    var _x;

    var _elasticX;

    var _xAxis = d3.svg.axis().orient('bottom');

    var _rowData;

    _chart.rowsCap = _chart.cap;

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.accent = accentRow;
    _chart.unAccent = unAccentRow;

    _chart.setYAxisLabel = function (yAxisLabel) {
        _yAxisLabel = yAxisLabel;
    }

    _chart.xAxisLabel = function (_, padding) {
        if (!arguments.length) {
            return _xAxisLabel;
        }
        _xAxisLabel = _;

        return _chart;
    };
/* --------------------------------------------------------------------------*/

    function calculateAxisScale () {
        if (!_x || _elasticX) {
            var extent = d3.extent(_rowData, _chart.cappedValueAccessor);
            if (extent[0] > 0) {
                extent[0] = 0;
            }
            _x = d3.scale.linear().domain(extent)
                .range([0, _chart.effectiveWidth()]);
        }
        _xAxis.scale(_x);
    }

    function drawAxis () {
/* OVERRIDE -----------------------------------------------------------------*/

        var root = _chart.root();

        var axisG = root.select('g.axis');

        calculateAxisScale();

        if (axisG.empty()) {

            if (_chart.autoScroll()) {

                axisG = root.append('div').attr('class', 'external-axis')
                    .append('svg').attr('height', 32)
                    .append('g').attr('class', 'axis')
                    .attr('transform', 'translate(' + _chart.margins().left + ', 0)');

            } else {
                axisG = _g.append('g').attr('class', 'axis')
                    .attr('transform', 'translate(0, ' + _chart.effectiveHeight() + ')');
            }
        }

        if (_chart.autoScroll()) {
            root.select('.external-axis svg').attr('width', _chart.width());
        }

        var yLabel = root.selectAll('.y-axis-label');

        if (yLabel.empty()) {
            yLabel = root.append('div')
            .attr('class', 'y-axis-label')
            .text(aliases[_yAxisLabel]);
        }

        yLabel
            .style('top', (_chart.effectiveHeight() / 2 + _chart.margins().top) +'px');


        var xLabel = root.selectAll('.x-axis-label');

        if (xLabel.empty()) {
            xLabel = root.append('div')
            .attr('class', 'x-axis-label')
            .text(_chart.xAxisLabel());
        }

        xLabel
            .style('left', (_chart.effectiveWidth()/2 + _chart.margins().left) +'px');
/* --------------------------------------------------------------------------*/

        dc.transition(axisG, _chart.transitionDuration())
            .call(_xAxis);
    }

    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g')
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');

        drawChart();

        return _chart;
    };

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

    _chart.label(_chart.cappedKeyAccessor);

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.measureValue = function (d) {
        return _chart.cappedValueAccessor(d);
    };
/* ------------------------------------------------------------------------- */

    /**
     * Gets or sets the x scale. The x scale can be any d3
     * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
     * @name x
     * @memberof dc.rowChart
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales quantitive scale}
     * @param {d3.scale} [scale]
     * @return {d3.scale}
     * @return {dc.rowChart}
     */
    _chart.x = function (scale) {
        if (!arguments.length) {
            return _x;
        }
        _x = scale;
        return _chart;
    };

    function drawGridLines () {
        _g.selectAll('g.tick')
            .select('line.grid-line')
            .remove();

        _g.selectAll('g.tick')
            .append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', function () {
                return -_chart.effectiveHeight();
            });
    }

    function drawChart () {
        _rowData = _chart.data();

        drawAxis();
        drawGridLines();

        var rows = _g.selectAll('g.' + _rowCssClass)
            .data(_rowData);

        createElements(rows);
        removeElements(rows);
        updateElements(rows);
    }

    function createElements (rows) {
        var rowEnter = rows.enter()
            .append('g')
            .attr('class', function (d, i) {
                return _rowCssClass + ' _' + i;
            });

        rowEnter.append('rect').attr('width', 0);

        createLabels(rowEnter);
        updateLabels(rows);
    }

    function removeElements (rows) {
        rows.exit().remove();
    }

    function rootValue () {
        var root = _x(0);
        return (root === -Infinity || root !== root) ? _x(1) : root;
    }

    function updateElements (rows) {
        var n = _rowData.length;

        var height;

        if (!_fixedBarHeight) {
            height = ((_chart.effectiveHeight() - _gap) - (n + 1) * _gap) / n;
        } else {
            height = _fixedBarHeight;
        }

/* OVERRIDE -----------------------------------------------------------------*/

        _isBigBar = _labelOffsetY * 2 > (_chart.measureLabelsOn() ? 64 : 32);

        if (_isBigBar) {
            height = ((_chart.effectiveHeight() - _gap) - (n + 1) * _gap) / n;
        }

        if (_chart.autoScroll() && height < _minBarHeight) {
            height = _minBarHeight;
            _chart.root().select('.svg-wrapper')
                .style('height', _chart.height() - 52 + 'px')
                .style('overflow-y', 'auto')
                .style('overflow-x', 'hidden');
            _chart.svg()
                .attr('height', n * (height + _gap) + 8);
        }
/* --------------------------------------------------------------------------*/

        // vertically align label in center unless they override the value via property setter
        if (!_hasLabelOffsetY) {
            _labelOffsetY = height / 2;
        }

        var rect = rows.attr('transform', function (d, i) {
                return 'translate(0,' + ((i + 1) * _gap + i * height) + ')';
            }).select('rect')
            .attr('height', height)
            .attr('fill', _chart.getColor)
            .on('click', onClick)
            .classed('deselected', function (d) {
                return (_chart.hasFilter()) ? !isSelectedRow(d) : false;
            })
            .classed('selected', function (d) {
                return (_chart.hasFilter()) ? isSelectedRow(d) : false;
            });

        dc.transition(rect, _chart.transitionDuration())
            .attr('width', function (d) {
                return Math.abs(rootValue() - _x(_chart.valueAccessor()(d)));
            })
            .attr('transform', translateX);

        createTitles(rows);
        updateLabels(rows);
    }

    function createTitles (rows) {
        if (_chart.renderTitle()) {
            rows.selectAll('title').remove();
            rows.append('title').text(_chart.title());
        }
    }

    function createLabels (rowEnter) {
        if (_chart.renderLabel()) {
            rowEnter.append('text')
                .on('click', onClick);
        }

/* OVERRIDE -----------------------------------------------------------------*/
        if (_chart.measureLabelsOn()) {
            rowEnter.append('text')
                .attr('class', 'value-measure')
                .on('click', onClick);
        }
/* --------------------------------------------------------------------------*/

        if (_chart.renderTitleLabel()) {
            rowEnter.append('text')
                .attr('class', _titleRowCssClass)
                .on('click', onClick);
        }
    }

    function updateLabels (rows) {

/* OVERRIDE -----------------------------------------------------------------*/
        rows.selectAll('text')
            .style('font-size', _isBigBar ? '14px': '12px');
/* --------------------------------------------------------------------------*/

        if (_chart.renderLabel()) {
            var lab = rows.select('text')
                .attr('x', _labelOffsetX)
                .attr('y', _labelOffsetY)
                .attr('dy', _dyOffset)
/* OVERRIDE -----------------------------------------------------------------*/
                .attr('dy', isStackLabel() ?  '-0.25em' : _dyOffset)
/* --------------------------------------------------------------------------*/
                .on('click', onClick)
                .attr('class', function (d, i) {
                    return _rowCssClass + ' _' + i;
                })
/* OVERRIDE -----------------------------------------------------------------*/
                .classed('value-dim', true)
/* --------------------------------------------------------------------------*/
                .text(function (d) {
                    return _chart.label()(d);
                });
            dc.transition(lab, _chart.transitionDuration())
                .attr('transform', translateX);
        }

/* OVERRIDE -----------------------------------------------------------------*/
        if (_chart.measureLabelsOn()) {
            var commafy = d3.format(',');

            var measureLab = rows.select('.value-measure')
                .attr('y', _labelOffsetY)
                .attr('dy', isStackLabel() ?  '1.1em' : _dyOffset)
                .on('click', onClick)
                .attr('text-anchor', isStackLabel() ? 'start':'end')
                .text(function(d){
                    return commafy(_chart.measureValue(d));
                })
                .attr('x', function (d, i) {
                    if (isStackLabel()) {
                        return _labelOffsetX + 1;
                    }

                    var thisLabel = d3.select(this);

                    var width = Math.abs(rootValue() - _x(_chart.valueAccessor()(d)));
                    var measureWidth = thisLabel.node().getBBox().width;
                    var dimWidth = _chart.svg().select('text.value-dim._' + i).node().getBBox().width;
                    var minIdealWidth = measureWidth + dimWidth + 16;

                    thisLabel.attr('text-anchor', isStackLabel() || width < minIdealWidth ? 'start' : 'end');

                    return width > minIdealWidth ? width - 4 : dimWidth + 12;
                });
            dc.transition(measureLab, _chart.transitionDuration())
                .attr('transform', translateX);
        }
/* --------------------------------------------------------------------------*/

        if (_chart.renderTitleLabel()) {
            var titlelab = rows.select('.' + _titleRowCssClass)
                    .attr('x', _chart.effectiveWidth() - _titleLabelOffsetX)
                    .attr('y', _labelOffsetY)
                    .attr('text-anchor', 'end')
                    .on('click', onClick)
                    .attr('class', function (d, i) {
                        return _titleRowCssClass + ' _' + i ;
                    })
                    .text(function (d) {
                        return _chart.title()(d);
                    });
            dc.transition(titlelab, _chart.transitionDuration())
                .attr('transform', translateX);
        }
    }

    /**
     * Turn on/off Title label rendering (values) using SVG style of text-anchor 'end'
     * @name renderTitleLabel
     * @memberof dc.rowChart
     * @instance
     * @param {Boolean} [renderTitleLabel=false]
     * @return {Boolean}
     * @return {dc.rowChart}
     */
    _chart.renderTitleLabel = function (renderTitleLabel) {
        if (!arguments.length) {
            return _renderTitleLabel;
        }
        _renderTitleLabel = renderTitleLabel;
        return _chart;
    };

    function onClick (d) {
        _chart.onClick(d);
    }

/* OVERRIDE -----------------------------------------------------------------*/
    function isStackLabel() {
        return _chart.measureLabelsOn() && _labelOffsetY > 16;
    }
/* --------------------------------------------------------------------------*/

    function translateX (d) {
        var x = _x(_chart.cappedValueAccessor(d)),
            x0 = rootValue(),
            s = x > x0 ? x0 : x;
        return 'translate(' + s + ',0)';
    }

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

    /**
     * Get the x axis for the row chart instance.  Note: not settable for row charts.
     * See the {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3 axis object}
     * documention for more information.
     * @name xAxis
     * @memberof dc.rowChart
     * @instance
     * @see {@link https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis d3.svg.axis}
     * @example
     * // customize x axis tick format
     * chart.xAxis().tickFormat(function (v) {return v + '%';});
     * // customize x axis tick values
     * chart.xAxis().tickValues([0, 100, 200, 300]);
     * @return {d3.svg.axis}
     */
    _chart.xAxis = function () {
        return _xAxis;
    };

    /**
     * Get or set the fixed bar height. Default is [false] which will auto-scale bars.
     * For example, if you want to fix the height for a specific number of bars (useful in TopN charts)
     * you could fix height as follows (where count = total number of bars in your TopN and gap is
     * your vertical gap space).
     * @name fixedBarHeight
     * @memberof dc.rowChart
     * @instance
     * @example
     * chart.fixedBarHeight( chartheight - (count + 1) * gap / count);
     * @param {Boolean|Number} [fixedBarHeight=false]
     * @return {Boolean|Number}
     * @return {dc.rowChart}
     */
    _chart.fixedBarHeight = function (fixedBarHeight) {
        if (!arguments.length) {
            return _fixedBarHeight;
        }
        _fixedBarHeight = fixedBarHeight;
        return _chart;
    };

    /**
     * Get or set the vertical gap space between rows on a particular row chart instance
     * @name gap
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [gap=5]
     * @return {Number}
     * @return {dc.rowChart}
     */
    _chart.gap = function (gap) {
        if (!arguments.length) {
            return _gap;
        }
        _gap = gap;
        return _chart;
    };

    /**
     * Get or set the elasticity on x axis. If this attribute is set to true, then the x axis will rescle to auto-fit the
     * data range when filtered.
     * @name elasticX
     * @memberof dc.rowChart
     * @instance
     * @param {Boolean} [elasticX]
     * @return {Boolean}
     * @return {dc.rowChart}
     */
    _chart.elasticX = function (elasticX) {
        if (!arguments.length) {
            return _elasticX;
        }
        _elasticX = elasticX;
        return _chart;
    };

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.autoScroll = function (autoScroll) {
        if (!arguments.length) {
            return _autoScroll;
        }
        _autoScroll = autoScroll;
        return _chart;
    };

/* --------------------------------------------------------------------------*/
    /**
     * Get or set the x offset (horizontal space to the top left corner of a row) for labels on a particular row chart.
     * @name labelOffsetX
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [labelOffsetX=10]
     * @return {Number}
     * @return {dc.rowChart}
     */
    _chart.labelOffsetX = function (labelOffsetX) {
        if (!arguments.length) {
            return _labelOffsetX;
        }
        _labelOffsetX = labelOffsetX;
        return _chart;
    };

    /**
     * Get or set the y offset (vertical space to the top left corner of a row) for labels on a particular row chart.
     * @name labelOffsetY
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [labelOffsety=15]
     * @return {Number}
     * @return {dc.rowChart}
     */
    _chart.labelOffsetY = function (labelOffsety) {
        if (!arguments.length) {
            return _labelOffsetY;
        }
        _labelOffsetY = labelOffsety;
        _hasLabelOffsetY = true;
        return _chart;
    };

    /**
     * Get of set the x offset (horizontal space between right edge of row and right edge or text.
     * @name titleLabelOffsetX
     * @memberof dc.rowChart
     * @instance
     * @param {Number} [titleLabelOffsetX=2]
     * @return {Number}
     * @return {dc.rowChart}
     */
    _chart.titleLabelOffsetX = function (titleLabelOffsetX) {
        if (!arguments.length) {
            return _titleLabelOffsetX;
        }
        _titleLabelOffsetX = titleLabelOffsetX;
        return _chart;
    };

/* OVERRIDE -----------------------------------------------------------------*/
    function accentRow(label) {
      _chart.selectAll('g.' + _rowCssClass).each(function (d) {
        if (_chart.cappedKeyAccessor(d) == label) {
          _chart.accentSelected(this);
        }
      });
    }

    function unAccentRow(label) {
      _chart.selectAll('g.' + _rowCssClass).each(function (d) {
        if (_chart.cappedKeyAccessor(d) == label) {
          _chart.unAccentSelected(this);
        }
      });
    }
/* --------------------------------------------------------------------------*/

    function isSelectedRow (d) {
        return _chart.hasFilter(_chart.cappedKeyAccessor(d));
    }

    return _chart.anchor(parent, chartGroup);
};
/* ****************************************************************************
 * OVERRIDE: dc.rowChart                                                      *
 * ***************************************************************************/
