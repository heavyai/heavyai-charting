/******************************************************************************
 * OVERRIDE: dc.pieChart                                                      *
 * ***************************************************************************/
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
    var _chart = dc.capMixin(dc.colorMixin(dc.baseMixin({})));

/* OVERRIDE ---------------------------------------------------------------- */
    var _pieStyle; // "pie" or "donut"
    var _pieSizeThreshold = 480;
    _chart.redoSelect = highlightFilter;
    _chart.accent = accentSlice;
    _chart.unAccent = unAccentSlice;
/* ------------------------------------------------------------------------- */

    _chart.colorAccessor(_chart.cappedKeyAccessor);

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ': ' + _chart.cappedValueAccessor(d);
    });

    _chart.slicesCap = _chart.cap;

    _chart.label(_chart.cappedKeyAccessor);
    _chart.renderLabel(true);

    _chart.transitionDuration(350);

/* OVERRIDE ---------------------------------------------------------------- */
    _chart.measureValue = function (d) {
        return _chart.cappedValueAccessor(d);
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

/* TODO: ------------------------------------------------------------------- */
// This was either deleted or did not exist when dc.mapd.js was written.
            dc.transition(_g, _chart.transitionDuration())
                .attr('transform', 'translate(' + _chart.cx() + ',' + _chart.cy() + ')');
/* ------------------------------------------------------------------------- */

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

/* OVERRIDE ---------------------------------------------------------------- */
                return _chart.title()(d.data);
                // return _chart.title()(d);
/* ------------------------------------------------------------------------- */

            });
        }
    }

    function positionLabels (labelsEnter, arc) {
        dc.transition(labelsEnter, _chart.transitionDuration())
            .attr('transform', function (d) {
                return labelPosition(d, arc);
            });

/* OVERRIDE ---------------------------------------------------------------- */
        var showLabel = true;

        labelsEnter
            .style('font-size', function(d){
                var data = d.data;
                var label = d3.select(this);

                if ( showLabel && !sliceHasNoData(data)) {
                    
                    var availableLabelWidth = getAvailableLabelWidth(d);
                    var charPixelWidth = 8;

                    label.select('.value-dim')
                        .html(function(){
                            var dimText = truncateLabel(_chart.label()(d.data), availableLabelWidth, charPixelWidth);

                            if (dimText === '') {
                                showLabel = false;
                            }
                            return dimText;
                        });

                    if (showLabel && _chart.measureLabelsOn()) {
                        label.select('.value-measure')
                            .html(truncateLabel(_chart.measureValue(d.data), availableLabelWidth, charPixelWidth));
                    }
                }

                return pieIsBig() ? '16px' : '12px';
            });          
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
        }
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

    _chart.externalRadiusPadding = function (externalRadiusPadding) {
        if (!arguments.length) {
            return _externalRadiusPadding;
        }
        _externalRadiusPadding = externalRadiusPadding;
        return _chart;
    };

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

    _chart.radius = function (radius) {
        if (!arguments.length) {
            return _givenRadius;
        }
        _givenRadius = radius;
        return _chart;
    };

    _chart.cx = function (cx) {
        if (!arguments.length) {
            return (_cx ||  _chart.width() / 2);
        }
        _cx = cx;
        return _chart;
    };

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
        return _chart.hasFilter(_chart.cappedKeyAccessor(d.data));
    }

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

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

    function truncateLabel(data, availableLabelWidth, charPixelWidth) {
        var labelText = data + '';
        var textWidth = labelText.length * charPixelWidth;
        var trimIndex = labelText.length - Math.ceil((textWidth - availableLabelWidth) / charPixelWidth);

        if (textWidth > availableLabelWidth && labelText.length - trimIndex > 2) {
            labelText = trimIndex > 2 ? labelText.slice(0, trimIndex) + '&#8230;' : '';
        } 

        return labelText;                
    }
 
/* ------------------------------------------------------------------------- */

    function sliceTooSmall(d) {
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
        coordinates = d3.mouse(this);
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

    _chart.emptyTitle = function (title) {
        if (arguments.length === 0) {
            return _emptyTitle;
        }
        _emptyTitle = title;
        return _chart;
    };

    _chart.externalLabels = function (radius) {
        if (arguments.length === 0) {
            return _externalLabelRadius;
        } else if (radius) {
            _externalLabelRadius = radius;
        } else {
            _externalLabelRadius = undefined;
        }

        return _chart;
    };

    function labelPosition (d, arc) {
/* OVERRIDE -----------------------------------------------------------------*/
        var centroid = labelCentroid(d, arc);
/* --------------------------------------------------------------------------*/
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

