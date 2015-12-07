/* ****************************************************************************
 * OVERRIDE: dc.geoChoroplethChart                                            *
 * ***************************************************************************/
dc.geoChoroplethChart = function (parent, chartGroup) {
    var _chart = dc.colorMixin(dc.baseMixin({}));

    _chart.colorAccessor(function (d) {
        return d || 0;
    });

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.accent = accentPoly;
    _chart.unAccent = unAccentPoly;

    var _hasBeenRendered = false;
/* --------------------------------------------------------------------------*/

    var _geoPath = d3.geo.path();
    var _projectionFlag;

    var _geoJsons = [];


    _chart._doRender = function () {
        _chart.resetSvg();
        for (var layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
            var states = _chart.svg().append('g')
                .attr('class', 'layer' + layerIndex)
                .attr('transform', 'translate(0, -16)');

            var regionG = states.selectAll('g.' + geoJson(layerIndex).name)
                .data(geoJson(layerIndex).data)
                .enter()
                .append('g')
                .attr('class', geoJson(layerIndex).name);

            regionG
                .append('path')
                .attr('fill', 'white')
                .attr('d', _geoPath);

            regionG.append('title');

            plotData(layerIndex);
        }
        _projectionFlag = false;
/* OVERRIDE -----------------------------------------------------------------*/
        _hasBeenRendered = true;
/* --------------------------------------------------------------------------*/
        
    };

    function plotData (layerIndex) {
        var data = generateLayeredData();

        if (isDataLayer(layerIndex)) {
            var regionG = renderRegionG(layerIndex);

            renderPaths(regionG, layerIndex, data);

            //renderTitle(regionG, layerIndex, data);
        }
    }

    function generateLayeredData () {
        var data = {};
        var groupAll = _chart.data();
        for (var i = 0; i < groupAll.length; ++i) {
            data[_chart.keyAccessor()(groupAll[i])] = _chart.valueAccessor()(groupAll[i]);
        }
        return data;
    }

    function isDataLayer (layerIndex) {
        return geoJson(layerIndex).keyAccessor;
    }

    function renderRegionG (layerIndex) {
        var regionG = _chart.svg()
            .selectAll(layerSelector(layerIndex))
            .classed('selected', function (d) {
                return isSelected(layerIndex, d);
            })
            .classed('deselected', function (d) {
                return isDeselected(layerIndex, d);
            })
            .attr('class', function (d) {
                var layerNameClass = geoJson(layerIndex).name;
                var regionClass = dc.utils.nameToId(geoJson(layerIndex).keyAccessor(d));
                var baseClasses = layerNameClass + ' ' + regionClass;
                if (isSelected(layerIndex, d)) {
                    baseClasses += ' selected';
                }
                if (isDeselected(layerIndex, d)) {
                    baseClasses += ' deselected';
                }
                return baseClasses;
            });

        return regionG;
    }

    function layerSelector (layerIndex) {
        return 'g.layer' + layerIndex + ' g.' + geoJson(layerIndex).name;
    }

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    function accentPoly(label) {
      var layerNameClass = geoJson(0).name; // hack for now as we only allow one layer currently
    _chart.selectAll('g.' + layerNameClass).each(function (d) {
        if (getKey(0,d) == label) {
          _chart.accentSelected(this);
        }
      });
    }

    function unAccentPoly(label) {
      var layerNameClass = geoJson(0).name; // hack for now as we only allow one layer currently
    _chart.selectAll('g.' + layerNameClass).each(function (d) {
        if (getKey(0,d) == label) {
          _chart.unAccentSelected(this);
        }
      });
    }
/* --------------------------------------------------------------------------*/

    function isSelected (layerIndex, d) {
        return _chart.hasFilter() && _chart.hasFilter(getKey(layerIndex, d));
    }

    function isDeselected (layerIndex, d) {
        return _chart.hasFilter() && !_chart.hasFilter(getKey(layerIndex, d));
    }

    function getKey (layerIndex, d) {
        return geoJson(layerIndex).keyAccessor(d);
    }

    function geoJson (index) {
        return _geoJsons[index];
    }

    function renderPaths (regionG, layerIndex, data) {
        var paths = regionG
            .select('path')
            .attr('fill', function () {
                var currentFill = d3.select(this).attr('fill');
                if (currentFill) {
                    console.log(currentFill);
                    return currentFill;
                }
                return '#e2e2e2';
            })
/* OVERRIDE ---------------------------------------------------------------- */
            .on('mouseenter', function(d, i){showPopup(d, i, data);})
            .on('mousemove', positionPopup)
            .on('mouseleave', hidePopup)
/* ------------------------------------------------------------------------- */
            .on('click', function (d) {
                return _chart.onClick(d, layerIndex);
            });

        dc.transition(paths, _chart.transitionDuration()).attr('fill', function (d, i) {
            return _chart.getColor(data[geoJson(layerIndex).keyAccessor(d)], i) || '#e2e2e2';
        });
    }

    _chart.onClick = function (d, layerIndex) {
        var selectedRegion = geoJson(layerIndex).keyAccessor(d);
        dc.events.trigger(function () {
            _chart.filter(selectedRegion);
            _chart.redrawGroup();
        });
    };

    function renderTitle (regionG, layerIndex, data) {
        if (_chart.renderTitle()) {
            regionG.selectAll('title').text(function (d) {
                var key = getKey(layerIndex, d);

/* OVERRIDE -----------------------------------------------------------------*/
                var value = Number(data[key]).toFixed(2);
                return _chart.title()({key0: key, value: value});
/* --------------------------------------------------------------------------*/

            });
        }
    }

    _chart._doRedraw = function () {
/* OVERRIDE -----------------------------------------------------------------*/
        if (!_hasBeenRendered)
            return _chart._doRender();
/* --------------------------------------------------------------------------*/
        for (var layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
            plotData(layerIndex);
            if (_projectionFlag) {
                _chart.svg().selectAll('g.' + geoJson(layerIndex).name + ' path').attr('d', _geoPath);
            }
        }
        _projectionFlag = false;
    };

    _chart.overlayGeoJson = function (json, name, keyAccessor) {
        for (var i = 0; i < _geoJsons.length; ++i) {
            if (_geoJsons[i].name === name) {
                _geoJsons[i].data = json;
                _geoJsons[i].keyAccessor = keyAccessor;
                return _chart;
            }
        }
        _geoJsons.push({name: name, data: json, keyAccessor: keyAccessor});
        return _chart;
    };

    _chart.projection = function (projection) {
        _geoPath.projection(projection);
        _projectionFlag = true;
        return _chart;
    };

    _chart.geoJsons = function () {
        return _geoJsons;
    };

    _chart.geoPath = function () {
        return _geoPath;
    };

    _chart.removeGeoJson = function (name) {
        var geoJsons = [];

        for (var i = 0; i < _geoJsons.length; ++i) {
            var layer = _geoJsons[i];
            if (layer.name !== name) {
                geoJsons.push(layer);
            }
        }

        _geoJsons = geoJsons;

        return _chart;
    };
/* OVERRIDE ---------------------------------------------------------------- */
    function showPopup(d, i, data) {
        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-box').html('');

        popupBox.append('div')
            .attr('class', 'popup-legend')
            .style('background-color', _chart.getColor(data[geoJson(0).keyAccessor(d)], i));

        popupBox.append('div')
            .attr('class', 'popup-value')
            .html(function(){
                var key = getKey(0, d);
                var value = isNaN(data[key]) ?  'N/A' : Number(data[key]).toFixed(2);
                return '<div class="popup-value-dim">'+ key +'</div><div class="popup-value-measure">'+ value +'</div>';
            });

        popup.classed('js-showPopup', true);
    }

    function hidePopup() {
        _chart.popup().classed('js-showPopup', false);
    }

    function positionPopup() {
        var coordinates = [0, 0];
        coordinates = d3.mouse(this);
        var x = coordinates[0];
        var y = coordinates[1];

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
 * END OVERRIDE: dc.geoChoroplethChart                                        *
 * ***************************************************************************/

