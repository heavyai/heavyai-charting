/* ****************************************************************************
 * OVERRIDE: dc.rowChart                                                      *
 * ***************************************************************************/
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

    function calculateAxisScale() {
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

/* OVERRIDE -----------------------------------------------------------------*/
        if (!_fixedBarHeight) {
            height = ((_chart.effectiveHeight() - _gap) - (n + 1) * _gap) / n;
        } else {
            height = _fixedBarHeight;
        }
        
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
                    var dimWidth = d3.select('text.value-dim._' + i).node().getBBox().width;
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

    _chart.xAxis = function () {
        return _xAxis;
    };

    _chart.fixedBarHeight = function (fixedBarHeight) {
        if (!arguments.length) {
            return _fixedBarHeight;
        }
        _fixedBarHeight = fixedBarHeight;
        return _chart;
    };

    _chart.gap = function (gap) {
        if (!arguments.length) {
            return _gap;
        }
        _gap = gap;
        return _chart;
    };

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
    _chart.labelOffsetX = function (labelOffsetX) {
        if (!arguments.length) {
            return _labelOffsetX;
        }
        _labelOffsetX = labelOffsetX;
        return _chart;
    };

    _chart.labelOffsetY = function (labelOffsety) {
        if (!arguments.length) {
            return _labelOffsetY;
        }
        _labelOffsetY = labelOffsety;
        _hasLabelOffsetY = true;
        return _chart;
    };

    _chart.titleLabelOffsetX = function (titleLabelOffsetX) {
        if (!arguments.length) {
            return _titleLabelOffsetX;
        }
        _titleLabelOffsetX = titleLabelOffsetX;
        return _chart;
    };

/* OVERRIDE EXTEND ----------------------------------------------------------*/
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
