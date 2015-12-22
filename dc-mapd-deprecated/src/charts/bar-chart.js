/******************************************************************************
 * OVERRIDE: dc.barChart                                                      *
 * ***************************************************************************/
dc.barChart = function (parent, chartGroup) {
    var MIN_BAR_WIDTH = 1;
    var DEFAULT_GAP_BETWEEN_BARS = 2;

    var _chart = dc.stackMixin(dc.coordinateGridMixin({}));

    var _gap = DEFAULT_GAP_BETWEEN_BARS;
    var _centerBar = false;
    var _alwaysUseRounding = false;

/* OVERRIDE ---------------------------------------------------------------- */
    var _numBars;
    var _parent = parent;

    _chart.accent = accentBar;
    _chart.unAccent = unAccentBar;
    _chart._numberOfBars = null;
/* ------------------------------------------------------------------------- */

    var _barWidth;

    dc.override(_chart, 'rescale', function () {
        _chart._rescale();
        _barWidth = undefined;

/* TODO: ------------------------------------------------------------------- */
// This was either deleted or did not exist when dc.mapd.js was written. 
        return _chart;
/* ------------------------------------------------------------------------- */
    });

/* OVERRIDE ---------------------------------------------------------------- */
    // dc.override(_chart, 'render', function () {
    //     if (_chart.round() && _centerBar && !_alwaysUseRounding) {
    //         dc.logger.warn('By default, brush rounding is disabled if bars are centered. ' +
    //                      'See dc.js bar chart API documentation for details.');
    //     }
    //
    //     return _chart._render();
    // });
/* ------------------------------------------------------------------------- */

    _chart.plotData = function () {
        var layers = _chart.chartBodyG().selectAll('g.stack')
            .data(_chart.data());

        calculateBarWidth();

        layers
            .enter()
            .append('g')
            .attr('class', function (d, i) {
                return 'stack ' + '_' + i;
            });

        layers.each(function (d, i) {
            var layer = d3.select(this);

            renderBars(layer, i, d);
        });
    };

    function barHeight (d) {
        return dc.utils.safeNumber(Math.abs(_chart.y()(d.y + d.y0) - _chart.y()(d.y0)));
    }

    function renderBars (layer, layerIndex, d) {

/* OVERRIDE ---------------------------------------------------------------- */
        _numBars = d.values.length;
/* ------------------------------------------------------------------------- */

        var bars = layer.selectAll('rect.bar')
            .data(d.values, dc.pluck('x'));

        var enter = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('fill', dc.pluck('data', _chart.getColor))
            .attr('y', _chart.yAxisHeight())
            .attr('height', 0);

        if (_chart.renderTitle()) {
            enter.append('title').text(dc.pluck('data', _chart.title(d.name)));
        }

        if (_chart.isOrdinal()) {
            bars.on('click', _chart.onClick);
        }

        dc.transition(bars, _chart.transitionDuration())
            .attr('x', function (d) {
                var x = _chart.x()(d.x);
                if (_centerBar) {
                    x -= _barWidth / 2;
                }
                if (_chart.isOrdinal() && _gap !== undefined) {
                    x += _gap / 2;
                }
                return dc.utils.safeNumber(x);
            })
            .attr('y', function (d) {
                var y = _chart.y()(d.y + d.y0);

                if (d.y < 0) {
                    y -= barHeight(d);
                }

                return dc.utils.safeNumber(y);
            })
            .attr('width', _barWidth)
            .attr('height', function (d) {
                return barHeight(d);
            })
            .attr('fill', dc.pluck('data', _chart.getColor))
            .select('title').text(dc.pluck('data', _chart.title(d.name)));

        dc.transition(bars.exit(), _chart.transitionDuration())
            .attr('height', 0)
            .remove();
    }

    function calculateBarWidth () {

/* OVERRIDE -----------------------------------------------------------------*/
   //   if (_barWidth === undefined) {
            if (_chart._numberOfBars === null) {
                var numberOfBars = _chart.xUnitCount();
            }
            else {
                var numberOfBars = _chart._numberOfBars;
            }
/* --------------------------------------------------------------------------*/

            // please can't we always use rangeBands for bar charts?
            if (_chart.isOrdinal() && _gap === undefined) {
                _barWidth = Math.floor(_chart.x().rangeBand());
            } else if (_gap) {
                _barWidth = Math.floor((_chart.xAxisLength() - (numberOfBars - 1) * _gap) / numberOfBars);
            } else {
                _barWidth = Math.floor(_chart.xAxisLength() / (1 + _chart.barPadding()) / numberOfBars);
            }

            if (_barWidth === Infinity || isNaN(_barWidth) || _barWidth < MIN_BAR_WIDTH) {
                _barWidth = MIN_BAR_WIDTH;
            }

/* OVERRIDE -----------------------------------------------------------------*/
   //   }
/* --------------------------------------------------------------------------*/
    }

    _chart.fadeDeselectedArea = function () {
        var bars = _chart.chartBodyG().selectAll('rect.bar');
        var extent = _chart.brush().extent();

        if (_chart.isOrdinal()) {
            if (_chart.hasFilter()) {
                bars.classed(dc.constants.SELECTED_CLASS, function (d) {
                    return _chart.hasFilter(d.x);
                });
                bars.classed(dc.constants.DESELECTED_CLASS, function (d) {
                    return !_chart.hasFilter(d.x);
                });
            } else {
                bars.classed(dc.constants.SELECTED_CLASS, false);
                bars.classed(dc.constants.DESELECTED_CLASS, false);
            }
        } else {
            if (!_chart.brushIsEmpty(extent)) {
                var start = extent[0];
                var end = extent[1];

                bars.classed(dc.constants.DESELECTED_CLASS, function (d) {
                    return d.x < start || d.x >= end;
                });
            } else {
                bars.classed(dc.constants.DESELECTED_CLASS, false);
            }
        }
    };

    _chart.centerBar = function (centerBar) {
        if (!arguments.length) {
            return _centerBar;
        }
        _centerBar = centerBar;
        return _chart;
    };

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    function accentBar (value) {
      var chartDomain = _chart.x().domain();
      var barNum = Math.floor((value - chartDomain[0]) / (chartDomain[1] - chartDomain[0]) * _numBars);
      _chart.accentSelected($("rect.bar", _parent).get(barNum));
    }

    function unAccentBar (value) {
      var chartDomain = _chart.x().domain();
      var barNum = Math.floor((value - chartDomain[0]) / (chartDomain[1] - chartDomain[0]) * _numBars);

      _chart.unAccentSelected($("rect.bar", _parent).get(barNum));
    };
/* OVERRIDE EXTEND ----------------------------------------------------------*/

    dc.override(_chart, 'onClick', function (d) {
        _chart._onClick(d.data);
    });

    _chart.barPadding = function (barPadding) {
        if (!arguments.length) {
            return _chart._rangeBandPadding();
        }
        _chart._rangeBandPadding(barPadding);
        _gap = undefined;
        return _chart;
    };

    _chart._useOuterPadding = function () {
        return _gap === undefined;
    };

    _chart.outerPadding = _chart._outerRangeBandPadding;

    _chart.gap = function (gap) {
        if (!arguments.length) {
            return _gap;
        }
        _gap = gap;
        return _chart;
    };

    _chart.extendBrush = function () {
        var extent = _chart.brush().extent();
        if (_chart.round() && (!_centerBar || _alwaysUseRounding)) {
            extent[0] = extent.map(_chart.round())[0];
            extent[1] = extent.map(_chart.round())[1];

            _chart.chartBodyG().select('.brush')
                .call(_chart.brush().extent(extent));
        }

        return extent;
    };

    _chart.alwaysUseRounding = function (alwaysUseRounding) {
        if (!arguments.length) {
            return _alwaysUseRounding;
        }
        _alwaysUseRounding = alwaysUseRounding;
        return _chart;
    };

    function colorFilter (color, inv) {
        return function () {
            var item = d3.select(this);
            var match = item.attr('fill') === color;
            return inv ? !match : match;
        };
    }

    _chart.legendHighlight = function (d) {
        if (!_chart.isLegendableHidden(d)) {
            _chart.g().selectAll('rect.bar')
                .classed('highlight', colorFilter(d.color))
                .classed('fadeout', colorFilter(d.color, true));
        }
    };

    _chart.legendReset = function () {
        _chart.g().selectAll('rect.bar')
            .classed('highlight', false)
            .classed('fadeout', false);
    };

    dc.override(_chart, 'xAxisMax', function () {
        var max = this._xAxisMax();
        if ('resolution' in _chart.xUnits()) {
            var res = _chart.xUnits().resolution;
            max += res;
        }
        return max;
    });

    return _chart.anchor(parent, chartGroup);
};
/* ****************************************************************************
 * END OVERRIDE: dc.barChart                                                  *
 * ***************************************************************************/

