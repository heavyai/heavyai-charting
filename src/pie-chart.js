/**
 * The pie chart implementation is usually used to visualize a small categorical distribution.  The pie
 * chart uses keyAccessor to determine the slices, and valueAccessor to calculate the size of each
 * slice relative to the sum of all values. Slices are ordered by {@link #dc.baseMixin+ordering ordering}
 * which defaults to sorting by key.
 *
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * @name pieChart
 * @memberof dc
 * @mixes dc.capMixin
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a pie chart under #chart-container1 element using the default global chart group
 * var chart1 = dc.pieChart('#chart-container1');
 * // create a pie chart under #chart-container2 element using chart group A
 * var chart2 = dc.pieChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.pieChart}
 */
dc.pieChart = function (parent, chartGroup) {
    var DEFAULT_MIN_ANGLE_FOR_LABEL = 0.4;

    var _sliceCssClass = 'pie-slice';
    var _emptyCssClass = 'empty-chart';
    var _emptyTitle = 'empty';

    var _radius,
        _givenRadius, // specified radius, if any
        _innerRadius = 0,
        _externalRadiusPadding = 0;

    var _g;
    var _cx;
    var _cy;
    var _minAngleForLabel = DEFAULT_MIN_ANGLE_FOR_LABEL;
    var _externalLabelRadius;
    var _drawPaths = false;
    var _chart = dc.capMixin(dc.colorMixin(dc.baseMixin({})));

/* OVERRIDE ---------------------------------------------------------------- */
    var _pieStyle; // "pie" or "donut"
    var _pieSizeThreshold = 480;
    var _hasBeenRendered = false;
    _chart.redoSelect = highlightFilter;
    _chart.accent = accentSlice;
    _chart.unAccent = unAccentSlice;
/* ------------------------------------------------------------------------- */

    _chart.colorAccessor(_chart.cappedKeyAccessor);

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

    /**
     * Get or set the maximum number of slices the pie chart will generate. The top slices are determined by
     * value from high to low. Other slices exeeding the cap will be rolled up into one single *Others* slice.
     * @name slicesCap
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cap]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.slicesCap = _chart.cap;

    _chart.label(_chart.cappedKeyAccessor);
    _chart.renderLabel(true);

    _chart.transitionDuration(350);

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.measureValue = function (d) {
        return _chart.formatValue(_chart.cappedValueAccessor(d));
    };

    _chart.redoSelect = highlightFilter;
    _chart.accent = accentSlice;
    _chart.unAccent = unAccentSlice;
/* ------------------------------------------------------------------------- */

    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g')
            .attr('class', 'pie-wrapper')
            .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');

        drawChart();

/* OVERRIDE -----------------------------------------------------------------*/
        _hasBeenRendered = true;
/* --------------------------------------------------------------------------*/
        return _chart;
    };

    function drawChart () {

/* OVERRIDE ---------------------------------------------------------------- */
        // set radius on basis of chart dimension if missing
        //_radius = d3.min([_chart.width(), _chart.height()]) / 2;
        _radius = _givenRadius ? _givenRadius : d3.min([_chart.width(), _chart.height()]) / 2;
/* ------------------------------------------------------------------------- */

        var arc = buildArcs();

        var pie = pieLayout();
        var pieData;
        // if we have data...
        if (d3.sum(_chart.data(), _chart.valueAccessor())) {
            pieData = pie(_chart.data());
            _g.classed(_emptyCssClass, false);
        } else {
            // otherwise we'd be getting NaNs, so override
            // note: abuse others for its ignoring the value accessor
            pieData = pie([{key: _emptyTitle, value: 1, others: [_emptyTitle]}]);
            _g.classed(_emptyCssClass, true);
        }

        if (_g) {
            var slices = _g.selectAll('g.' + _sliceCssClass)
                .data(pieData);

            createElements(slices, arc, pieData);

            updateElements(pieData, arc);

            removeElements(slices);

            highlightFilter();

            dc.transition(_g, _chart.transitionDuration())
                .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');
        }
    }

    function createElements (slices, arc, pieData) {
        var slicesEnter = createSliceNodes(slices);

        createSlicePath(slicesEnter, arc);

        createLabels(pieData, arc);
    }

    function createSliceNodes (slices) {
        var slicesEnter = slices
            .enter()
            .append('g')
            .attr('class', function (d, i) {
                return _sliceCssClass + ' _' + i;
            })
/* OVERRIDE ---------------------------------------------------------------- */
            .classed('stroke-thick', pieIsBig);
/* ------------------------------------------------------------------------- */
        return slicesEnter;
    }

    function createSlicePath (slicesEnter, arc) {
        var slicePath = slicesEnter.append('path')
            .attr('fill', fill)
            .on('click', onClick)
/* OVERRIDE ---------------------------------------------------------------- */
            .on('mouseenter', showPopup)
            .on('mousemove', positionPopup)
            .on('mouseleave', hidePopup)
/* ------------------------------------------------------------------------- */
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });

        dc.transition(slicePath, _chart.transitionDuration(), function (s) {
            s.attrTween('d', tweenPie);
        });
    }

    function createTitles (slicesEnter) {
        if (_chart.renderTitle()) {
            slicesEnter.append('title').text(function (d) {
                return _chart.title()(d.data);
            });
        }
    }

    function positionLabels (labelsEnter, arc) {
        dc.transition(labelsEnter, _chart.transitionDuration())
            .attr('transform', function (d) {
                return labelPosition(d, arc);
            });

/* OVERRIDE ---------------------------------------------------------------- */

        labelsEnter
            .style('font-size', (pieIsBig() ? '14px' : '12px'));

        labelsEnter.select('.value-dim')
            .text(function(d){
                return _chart.label()(d.data);
            })
            .html(function(d){
                var availableLabelWidth = getAvailableLabelWidth(d);
                var width = d3.select(this).node().getBoundingClientRect().width;
                console.log("getBoundingClientRect", width)
                var displayText = width > availableLabelWidth ? truncateLabel(_chart.label()(d.data), width, availableLabelWidth) : _chart.label()(d.data);

                d3.select(this.parentNode)
                    .classed('hide-label', displayText === '');

                return displayText;
            });

        if (_chart.measureLabelsOn()) {
            labelsEnter.select('.value-measure')
                .text(function(d){
                    return _chart.measureValue(d.data);
                })
                .html(function(d){
                    if (d3.select(this.parentNode).classed('hide-label')) { return '';}

                    var availableLabelWidth = getAvailableLabelWidth(d);
                    var width = d3.select(this).node().getBoundingClientRect().width;

                    return  width > availableLabelWidth ? truncateLabel(_chart.measureValue(d.data), width, availableLabelWidth) : _chart.measureValue(d.data);
                });
        }
/* ------------------------------------------------------------------------- */
    }

    function createLabels (pieData, arc) {
        if (_chart.renderLabel()) {
            var labels = _g.selectAll('g.pie-label')
                .data(pieData);

            labels.exit().remove();

            var labelsEnter = labels
                .enter()
/* OVERRIDE ---------------------------------------------------------------- */
                .append('g')
                .attr('class', function (d, i) {
                    var classes = 'pie-label _' + i;
                    if (_externalLabelRadius) {
                        classes += ' external';
                    }
                    return classes;
                })
                .attr('transform', function (d) {
                    return labelPosition(d, arc);
                })
/* ------------------------------------------------------------------------- */
                .on('click', onClick);

/* OVERRIDE ---------------------------------------------------------------- */
            labelsEnter
                .append('text')
                .attr('class', 'value-dim')
                .attr('dy', (_chart.measureLabelsOn() ? '0': '.4em'));

        if (_chart.measureLabelsOn()) {
            labelsEnter
                .append('text')
                .attr('class', 'value-measure')
                .attr('dy', '1.2em');
        }
/* ------------------------------------------------------------------------- */

            positionLabels(labelsEnter, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(pieData, arc);
            }
        }
    }

    function updateLabelPaths (pieData, arc) {
        var polyline = _g.selectAll('polyline.' + _sliceCssClass)
                .data(pieData);

        polyline
                .enter()
                .append('polyline')
                .attr('class', function (d, i) {
                    return 'pie-path _' + i + ' ' + _sliceCssClass;
                });

        polyline.exit().remove();
        dc.transition(polyline, _chart.transitionDuration())
            .attrTween('points', function (d) {
                this._current = this._current || d;
                var interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var arc2 = d3.svg.arc()
                            .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                            .innerRadius(_radius - _externalRadiusPadding);
                    var d2 = interpolate(t);
                    return [arc.centroid(d2), arc2.centroid(d2)];
                };
            })
            .style('visibility', function (d) {
                return d.endAngle - d.startAngle < 0.0001 ? 'hidden' : 'visible';
            });

    }

    function updateElements (pieData, arc) {
        updateSlicePaths(pieData, arc);
        updateLabels(pieData, arc);
        updateTitles(pieData);
    }

    function updateSlicePaths (pieData, arc) {
        var slicePaths = _g.selectAll('g.' + _sliceCssClass)
            .data(pieData)
            .select('path')
            .attr('d', function (d, i) {
                return safeArc(d, i, arc);
            });
        dc.transition(slicePaths, _chart.transitionDuration(),
            function (s) {
                s.attrTween('d', tweenPie);
            }).attr('fill', fill);
    }

    function updateLabels (pieData, arc) {
        if (_chart.renderLabel()) {
/* OVERRIDE ---------------------------------------------------------------- */
            var labels = _g.selectAll('g.pie-label')
/* ------------------------------------------------------------------------- */
                .data(pieData);
            positionLabels(labels, arc);
            if (_externalLabelRadius && _drawPaths) {
                updateLabelPaths(pieData, arc);
            }
        }
    }

    function updateTitles (pieData) {
        if (_chart.renderTitle()) {
            _g.selectAll('g.' + _sliceCssClass)
                .data(pieData)
                .select('title')
                .text(function (d) {
                    return _chart.title()(d.data);
                });
        }
    }

    function removeElements (slices) {
        slices.exit().remove();
    }

/* OVERRIDE ---------------------------------------------------------------- */
    function accentSlice(label) {
      _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
        if (_chart.cappedKeyAccessor(d.data) == label) {
          _chart.accentSelected(this);
        }
      });
    }

    function unAccentSlice(label) {
      _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
        if (_chart.cappedKeyAccessor(d.data) == label) {
          _chart.unAccentSelected(this);
        }
      });
    }
/* ------------------------------------------------------------------------- */

    function highlightFilter () {
        if (_chart.hasFilter()) {
            _chart.selectAll('g.' + _sliceCssClass).each(function (d) {
                if (isSelectedSlice(d)) {
                    _chart.highlightSelected(this);
                } else {
                    _chart.fadeDeselected(this);
                }
            });
        } else {
            _chart.selectAll('g.' + _sliceCssClass).each(function () {
                _chart.resetHighlight(this);
            });
        }
    }

    /**
     * Get or set the external radius padding of the pie chart. This will force the radius of the
     * pie chart to become smaller or larger depending on the value.
     * @name externalRadiusPadding
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [externalRadiusPadding=0]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.externalRadiusPadding = function (externalRadiusPadding) {
        if (!arguments.length) {
            return _externalRadiusPadding;
        }
        _externalRadiusPadding = externalRadiusPadding;
        return _chart;
    };

    /**
     * Get or set the inner radius of the pie chart. If the inner radius is greater than 0px then the
     * pie chart will be rendered as a doughnut chart.
     * @name innerRadius
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [innerRadius=0]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.innerRadius = function (innerRadius) {
        if (!arguments.length) {
/* OVERRIDE ---------------------------------------------------------------- */
            return _pieStyle ? ( _pieStyle === 'donut' ? (Math.min(_chart.width(), _chart.height()) - _externalRadiusPadding) / 5 : 0): _innerRadius;
/* ------------------------------------------------------------------------- */
        }
        _innerRadius = innerRadius;
        return _chart;
    };
/* OVERRIDE ---------------------------------------------------------------- */
     _chart.pieStyle = function (pieStyle) {

        if (!arguments.length) {
            return _pieStyle;
        }

        _pieStyle = pieStyle;
        return _chart;
    };
/* ------------------------------------------------------------------------- */

    /**
     * Get or set the outer radius. If the radius is not set, it will be half of the minimum of the
     * chart width and height.
     * @name radius
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [radius]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.radius = function (radius) {
        if (!arguments.length) {
            return _givenRadius;
        }
        _givenRadius = radius;
        return _chart;
    };

    /**
     * Get or set center x coordinate position. Default is center of svg.
     * @name cx
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cx]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.cx = function (cx) {
        if (!arguments.length) {
            return (_cx ||  _chart.width() / 2);
        }
        _cx = cx;
        return _chart;
    };

    /**
     * Get or set center y coordinate position. Default is center of svg.
     * @name cy
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [cy]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.cy = function (cy) {
        if (!arguments.length) {
            return (_cy ||  _chart.height() / 2);
        }
        _cy = cy;
        return _chart;
    };

    function buildArcs () {
/* OVERRIDE ---------------------------------------------------------------- */
        return d3.svg.arc().outerRadius(_radius - _externalRadiusPadding).innerRadius(_chart.innerRadius());
/* ------------------------------------------------------------------------- */
    }

    function isSelectedSlice (d) {
        return _chart.hasFilter(_chart.cappedKeyAccessor(d.data)) ^ _chart.filtersInverse();
    }

    _chart._doRedraw = function () {
/* OVERRIDE ---------------------------------------------------------------- */
        if (!_hasBeenRendered) // guard to prevent a redraw before a render
            return _chart._doRender();
/* ------------------------------------------------------------------------- */
        drawChart();
        return _chart;
    };

    /**
     * Get or set the minimal slice angle for label rendering. Any slice with a smaller angle will not
     * display a slice label.
     * @name minAngleForLabel
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [minAngleForLabel=0.5]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.minAngleForLabel = function (minAngleForLabel) {
        if (!arguments.length) {
            return _minAngleForLabel;
        }
        _minAngleForLabel = minAngleForLabel;
        return _chart;
    };

    function pieLayout () {
        return d3.layout.pie().sort(null).value(_chart.cappedValueAccessor);
    }

/* OVERRIDE ---------------------------------------------------------------- */
    function getAvailableLabelWidth (d) {
        var angle = (d.endAngle - d.startAngle);

        if (isNaN(angle) || angle * (_radius / 2) < (_chart.measureLabelsOn() ? 28 : 20)) {
            return 0;
        }

        var arc = buildArcs();
        var centroid = labelCentroid(d, arc);
        var adjacent = Math.abs(centroid[1]);
        var useAngle = centroid[0] * centroid[1] < 0 ? d.startAngle : d.endAngle;
        var refAngle = centroid[1] >= 0 ? Math.PI : (centroid[0] < 0 ? Math.PI * 2 : 0);

        var tan = Math.tan(Math.abs(refAngle - useAngle));
        var opposite = tan * adjacent;
        var labelWidth = (refAngle >= d.startAngle && refAngle < d.endAngle ? Math.abs(centroid[0]) + opposite : Math.abs(centroid[0]) - opposite) * 2;
        var maxLabelWidth = _radius - _chart.innerRadius() - 24;

        return labelWidth > maxLabelWidth || labelWidth < 0 ? maxLabelWidth : labelWidth;
    }

    function truncateLabel(data, width, availableLabelWidth) {

        var labelText = data + '';

        if (labelText.length < 4) {
            return '';
        }

        var trimIndex = labelText.length - Math.ceil((width - availableLabelWidth) / (width/labelText.length) * 1.25);

        if (labelText.length - trimIndex > 2) {
            labelText = trimIndex > 2  ? labelText.slice(0, trimIndex) + '&#8230;' : '';
        }

        return labelText;
    }

/* ------------------------------------------------------------------------- */

    function sliceTooSmall (d) {
        var angle = (d.endAngle - d.startAngle);
        return isNaN(angle) || angle < _minAngleForLabel;
    }

    function sliceHasNoData (d) {
        return _chart.cappedValueAccessor(d) === 0;
    }

    function tweenPie (b) {
/* OVERRIDE ---------------------------------------------------------------- */
        b.innerRadius = _chart.innerRadius();
/* ------------------------------------------------------------------------- */
        var current = this._current;
        if (isOffCanvas(current)) {
            current = {startAngle: 0, endAngle: 0};
        }
        var i = d3.interpolate(current, b);
        this._current = i(0);
        return function (t) {
            return safeArc(i(t), 0, buildArcs());
        };
    }

    function isOffCanvas (current) {
        return !current || isNaN(current.startAngle) || isNaN(current.endAngle);
    }

    function fill (d, i) {
        return _chart.getColor(d.data, i);
    }

    function onClick (d, i) {
        if (_g.attr('class') !== _emptyCssClass) {
            _chart.onClick(d.data, i);
        }
    }
/* OVERRIDE ---------------------------------------------------------------- */
    function showPopup(d, i) {
        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-box').html('');

        popupBox.append('div')
            .attr('class', 'popup-legend')
            .style('background-color', fill(d,i));

        popupBox.append('div')
            .attr('class', 'popup-value')
            .html(function(){
                return '<div class="popup-value-dim">'+ _chart.label()(d.data) +'</div><div class="popup-value-measure">'+ _chart.measureValue(d.data) +'</div>';
            });

        popup.classed('js-showPopup', true);
    }

    function hidePopup() {
        _chart.popup().classed('js-showPopup', false);
    }

    function positionPopup() {
        var coordinates = [0, 0];
        coordinates = _chart.popupCoordinates(d3.mouse(this));
        var x = coordinates[0] + _chart.width() / 2;
        var y = coordinates[1] + _chart.height() / 2;

        var popup =_chart.popup()
            .attr('style', function(){
                return 'transform:translate('+x+'px,'+y+'px)';
            });

        popup.select('.chart-popup-box')
            .classed('align-right', function(){
                return x + d3.select(this).node().getBoundingClientRect().width > _chart.width();
            });
    }

    function pieIsBig () {
        return _pieSizeThreshold < Math.min(_chart.width(), _chart.height());
    }
/* ------------------------------------------------------------------------- */

    function safeArc (d, i, arc) {
        var path = arc(d, i);
        if (path.indexOf('NaN') >= 0) {
            path = 'M0,0';
        }
        return path;
    }

    /**
     * Title to use for the only slice when there is no data.
     * @name emptyTitle
     * @memberof dc.pieChart
     * @instance
     * @param {String} [title]
     * @return {String}
     * @return {dc.pieChart}
     */
    _chart.emptyTitle = function (title) {
        if (arguments.length === 0) {
            return _emptyTitle;
        }
        _emptyTitle = title;
        return _chart;
    };

    /**
     * Position slice labels offset from the outer edge of the chart
     *
     * The given argument sets the radial offset.
     * @name externalLabels
     * @memberof dc.pieChart
     * @instance
     * @param {Number} [externalLabelRadius]
     * @return {Number}
     * @return {dc.pieChart}
     */
    _chart.externalLabels = function (externalLabelRadius) {
        if (arguments.length === 0) {
            return _externalLabelRadius;
        } else if (externalLabelRadius) {
            _externalLabelRadius = externalLabelRadius;
        } else {
            _externalLabelRadius = undefined;
        }

        return _chart;
    };

    /**
     * Get or set whether to draw lines from pie slices to their labels.
     *
     * @name drawPaths
     * @memberof dc.pieChart
     * @instance
     * @param {Boolean} [drawPaths]
     * @return {Boolean}
     * @return {dc.pieChart}
     */
    _chart.drawPaths = function (drawPaths) {
        if (arguments.length === 0) {
            return _drawPaths;
        }
        _drawPaths = drawPaths;
        return _chart;
    };

    function labelPosition (d, arc) {
        var centroid;
        if (_externalLabelRadius) {
            centroid = d3.svg.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid(d);
        } else {
/* OVERRIDE -----------------------------------------------------------------*/
        centroid = labelCentroid(d, arc);
/* --------------------------------------------------------------------------*/
        }
        if (isNaN(centroid[0]) || isNaN(centroid[1])) {
            return 'translate(0,0)';
        } else {
            return 'translate(' + centroid + ')';
        }
    }

/* OVERRIDE -----------------------------------------------------------------*/
    function labelCentroid (d, arc) {
        var centroid;
        if (_externalLabelRadius) {
            centroid = d3.svg.arc()
                .outerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .innerRadius(_radius - _externalRadiusPadding + _externalLabelRadius)
                .centroid(d);
        } else {
            centroid = _innerRadius === 0  && _pieStyle != 'donut' ? d3.svg.arc()
                .outerRadius(_radius - _externalRadiusPadding)
                .innerRadius(_radius / 5)
                .centroid(d) : arc.centroid(d);
        }

        return centroid;
    }
/* --------------------------------------------------------------------------*/

    _chart.legendables = function () {
        return _chart.data().map(function (d, i) {

/* OVERRIDE -----------------------------------------------------------------*/
            var legendable = {
              name: d.key0,
              data: d.value,
              others: d.others,
              chart:_chart
            };
/* --------------------------------------------------------------------------*/

            legendable.color = _chart.getColor(d, i);
            return legendable;
        });
    };

    _chart.legendHighlight = function (d) {
        highlightSliceFromLegendable(d, true);
    };

    _chart.legendReset = function (d) {
        highlightSliceFromLegendable(d, false);
    };

    _chart.legendToggle = function (d) {
        _chart.onClick({key: d.name, others: d.others});
    };

    function highlightSliceFromLegendable (legendable, highlighted) {
        _chart.selectAll('g.pie-slice').each(function (d) {
            if (legendable.name === d.data.key) {
                d3.select(this).classed('highlight', highlighted);
            }
        });
    }

    return _chart.anchor(parent, chartGroup);
};
/* ****************************************************************************
 * END OVERRIDE: dc.pieChart                                                  *
 * ***************************************************************************/
