import baseMixin from "../mixins/base-mixin"
import colorMixin from "../mixins/color-mixin"
import d3 from "d3"
import mapMixin from "../mixins/map-mixin"
import { transition } from "../core/core"
import { utils } from "../utils/utils"
import turfBbox from "@turf/bbox"
import turfBboxClip from "@turf/bbox-clip"

/**
 * The geo choropleth chart is designed as an easy way to create a crossfilter driven choropleth map
 * from GeoJson data. This chart implementation was inspired by
 * {@link http://bl.ocks.org/4060606 the great d3 choropleth example}.
 *
 * @name geoChoroplethChart
 * @memberof dc
 * @mixes dc.colorMixin
 * @mixes dc.baseMixin
 * @example
 * // create a choropleth chart under '#us-chart' element using the default global chart group
 * var chart1 = dc.geoChoroplethChart('#us-chart');
 * // create a choropleth chart under '#us-chart2' element using chart group A
 * var chart2 = dc.compositeChart('#us-chart2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.geoChoroplethChart}
 */
export default function geoChoroplethChart(parent, useMap, chartGroup, mapbox) {
  const _useMap = useMap !== undefined ? useMap : false
  const parentDivId = parent.attributes.id.value
  let _chart = null
  if (_useMap) {
    _chart = mapMixin(colorMixin(baseMixin({})), parentDivId, mapbox)
  } else {
    _chart = colorMixin(baseMixin({}))
  }

  _chart.colorAccessor(d => d || 0)

  /* OVERRIDE -----------------------------------------------------------------*/
  _chart.accent = accentPoly
  _chart.unAccent = unAccentPoly

  _chart.measureValue = function(d) {
    const customFormatter = _chart.valueFormatter()
    return (customFormatter && customFormatter(d)) || utils.formatValue(d)
  }

  let _hasBeenRendered = false
  /* --------------------------------------------------------------------------*/

  const _geoPath = d3.geo.path()
  if (_useMap) {
    _geoPath.projection(_chart.mapProject.bind(_chart))
  }

  _chart._projectionFlag

  let _geoJsons = []
  _chart.transitionDuration(0)

  function findGeomMinMax(layerIndex) {
    const _geoJson = geoJson(layerIndex)
    const { data } = _geoJson
    const realGeoJson = {
      type: "FeatureCollection",
      features: data
    }
    const [xMin, yMin, xMax, yMax] = turfBbox(realGeoJson)
    return [[xMin, yMin], [xMax, yMax]]
  }

  _chart.fitBounds = function() {
    if (geoJson(0)) {
      const bounds = geoJson(0).bounds
      const llb = _chart.convertBounds(bounds)
      _chart.map().fitBounds(llb, { animate: false }, { skipRedraw: true })
    }
  }

  _chart.destroyChart = function() {
    this.map().remove()
  }

  _chart.getClosestResult = function() { // don't use logic in mouseup event in map-mixin.js
    return
  }

  _chart._doRender = function(d) {
    _chart.resetSvg() // will use map mixin reset svg if we inherit map mixin
    for (let layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
      const states = _chart
        .svg()
        .append("g")
        .attr("class", "layer" + layerIndex)
      // .attr('transform', 'translate(0, -16)');

      // Clip each feature to the supported map extents
      const data = geoJson(layerIndex).data.map(feature =>
        turfBboxClip(feature, [
          _chart.lonMin(),
          _chart.latMin(),
          _chart.lonMax(),
          _chart.latMax()
        ])
      )

      const regionG = states
        .selectAll("g." + geoJson(layerIndex).name)
        .data(data)
        .enter()
        .append("g")
        .attr("class", geoJson(layerIndex).name)

      regionG
        .append("path")
        .attr("fill", "white")
        .attr("d", _geoPath)

      regionG.append("title")

      plotData(layerIndex, d)
    }
    _chart._projectionFlag = false

    /* OVERRIDE -----------------------------------------------------------------*/
    _hasBeenRendered = true
    /* --------------------------------------------------------------------------*/
  }

  function plotData(layerIndex, d) {
    const data = generateLayeredData(d)

    if (isDataLayer(layerIndex)) {
      const regionG = renderRegionG(layerIndex)

      renderPaths(regionG, layerIndex, data)

      // renderTitle(regionG, layerIndex, data);
    }
  }

  function generateLayeredData(d) {
    const data = {}
    const groupAll = d
    for (let i = 0; i < groupAll.length; ++i) {
      data[_chart.keyAccessor()(groupAll[i])] = _chart.valueAccessor()(
        groupAll[i]
      )
    }
    return data
  }

  function isDataLayer(layerIndex) {
    return geoJson(layerIndex).keyAccessor
  }

  function renderRegionG(layerIndex) {
    const regionG = _chart
      .svg()
      .selectAll(layerSelector(layerIndex))
      .classed("selected", d => isSelected(layerIndex, d))
      .classed("deselected", d => isDeselected(layerIndex, d))
      .attr("class", d => {
        const layerNameClass = geoJson(layerIndex).name
        const regionClass = utils.nameToId(geoJson(layerIndex).keyAccessor(d))
        let baseClasses = layerNameClass + " " + regionClass
        if (isSelected(layerIndex, d)) {
          baseClasses = baseClasses + " selected"
        }
        if (isDeselected(layerIndex, d)) {
          baseClasses = baseClasses + " deselected"
        }
        return baseClasses
      })
    return regionG
  }

  function layerSelector(layerIndex) {
    return "g.layer" + layerIndex + " g." + geoJson(layerIndex).name
  }

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  function accentPoly(label) {
    const layerNameClass = geoJson(0).name // hack for now as we only allow one layer currently
    _chart.selectAll("g." + layerNameClass).each(function(d) {
      if (getKey(0, d) == label) {
        _chart.accentSelected(this)
      }
    })
  }

  function unAccentPoly(label) {
    const layerNameClass = geoJson(0).name // hack for now as we only allow one layer currently
    _chart.selectAll("g." + layerNameClass).each(function(d) {
      if (getKey(0, d) == label) {
        _chart.unAccentSelected(this)
      }
    })
  }
  /* --------------------------------------------------------------------------*/

  function isSelected(layerIndex, d) {
    return (
      _chart.hasFilter() &&
      _chart.hasFilter(getKey(layerIndex, d)) ^ _chart.filtersInverse()
    )
  }

  function isDeselected(layerIndex, d) {
    return _chart.hasFilter() && !isSelected(layerIndex, d)
  }

  function getKey(layerIndex, d) {
    return geoJson(layerIndex).keyAccessor(d)
  }

  function geoJson(index) {
    return _geoJsons[index]
  }

  function renderPaths(regionG, layerIndex, data) {
    /* OVERRIDE ---------------------------------------------------------------- */
    const dragRegion = d3.behavior.drag().on("dragstart", () => {
      d3.event.sourceEvent.preventDefault()
    })
    /* ------------------------------------------------------------------------- */

    const paths = regionG
      .select("path")
      .attr("fill", function() {
        const currentFill = d3.select(this).attr("fill")
        if (currentFill) {
          return currentFill
        }
        return "#e2e2e2"
      })
      /* OVERRIDE ---------------------------------------------------------------- */
      .on("mouseenter", (d, i) => {
        showPopup(d, i, data)
      })
      .on("mousemove", positionPopup)
      .on("mouseleave", hidePopup)
      .call(dragRegion)
      /* ------------------------------------------------------------------------- */
      .on("click", d => _chart.onClick(d, layerIndex))

    transition(paths, _chart.transitionDuration()).attr("fill", (d, i) => {
      const dataColor = data[geoJson(layerIndex).keyAccessor(d)]
      return _chart.getColor(dataColor, i)
    })
  }

  _chart.onClick = function(d, layerIndex) {
    const selectedRegion = geoJson(layerIndex).keyAccessor(d)
    _chart.handleFilterClick(d3.event, selectedRegion)
  }

  function renderTitle(regionG, layerIndex, data) {
    if (_chart.renderTitle()) {
      regionG.selectAll("title").text(d => {
        const key = getKey(layerIndex, d)

        /* OVERRIDE -----------------------------------------------------------------*/
        const value = Number(data[key]).toFixed(2)
        return _chart.title()({ key0: key, value })
        /* --------------------------------------------------------------------------*/
      })
    }
  }

  _chart._doRedraw = function(data) {
    /* OVERRIDE -----------------------------------------------------------------*/
    if (!_hasBeenRendered) {
      return _chart._doRender()
    }
    /* --------------------------------------------------------------------------*/

    for (let layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
      plotData(layerIndex, data)
      if (_chart._projectionFlag) {
        _chart
          .svg()
          .selectAll("g." + geoJson(layerIndex).name + " path")
          .attr("d", _geoPath)
      }
    }
    _chart._projectionFlag = false
  }

  /**
   * **mandatory**
   *
   * Use this function to insert a new GeoJson map layer. This function can be invoked multiple times
   * if you have multiple GeoJson data layers to render on top of each other. If you overlay multiple
   * layers with the same name the new overlay will override the existing one.
   * @name overlayGeoJson
   * @memberof dc.geoChoroplethChart
   * @instance
   * @see {@link http://geojson.org/ GeoJSON}
   * @see {@link https://github.com/mbostock/topojson/wiki TopoJSON}
   * @see {@link https://github.com/mbostock/topojson/wiki/API-Reference#feature topojson.feature}
   * @example
   * // insert a layer for rendering US states
   * chart.overlayGeoJson(statesJson.features, 'state', function(d) {
   *      return d.properties.name;
   * })
   * @param {geoJson} json - a geojson feed
   * @param {String} name - name of the layer
   * @param {Function} keyAccessor - accessor function used to extract 'key' from the GeoJson data. The key extracted by
   * this function should match the keys returned by the crossfilter groups.
   * @return {dc.geoChoroplethChart}
   */
  _chart.overlayGeoJson = function(json, name, keyAccessor) {
    for (let i = 0; i < _geoJsons.length; ++i) {
      if (_geoJsons[i].name === name) {
        _geoJsons[i].data = json
        _geoJsons[i].keyAccessor = keyAccessor
        return _chart
      }
    }
    _geoJsons.push({ name, data: json, keyAccessor })
    _geoJsons[_geoJsons.length - 1].bounds = findGeomMinMax(
      _geoJsons.length - 1
    )

    return _chart
  }

  /**
   * Set custom geo projection function. See the available [d3 geo projection
   * functions](https://github.com/mbostock/d3/wiki/Geo-Projections).
   * @name projection
   * @memberof dc.geoChoroplethChart
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/Geo-Projections d3.geo.projection}
   * @see {@link https://github.com/d3/d3-geo-projection Extended d3.geo.projection}
   * @param {d3.projection} [projection=d3.geo.albersUsa()]
   * @return {dc.geoChoroplethChart}
   */
  _chart.projection = function(projection) {
    if (!_useMap) {
      _geoPath.projection(projection)
      _chart._projectionFlag = true
    }
    return _chart
  }

  /**
   * Returns all GeoJson layers currently registered with this chart. The returned array is a
   * reference to this chart's internal data structure, so any modification to this array will also
   * modify this chart's internal registration.
   * @name geoJsons
   * @memberof dc.geoChoroplethChart
   * @instance
   * @return {Array<{name:String, data: Object, accessor: Function}>}
   */
  _chart.geoJsons = function() {
    return _geoJsons
  }

  /**
   * Returns the {@link https://github.com/mbostock/d3/wiki/Geo-Paths#path d3.geo.path} object used to
   * render the projection and features.  Can be useful for figuring out the bounding box of the
   * feature set and thus a way to calculate scale and translation for the projection.
   * @name geoPath
   * @memberof dc.geoChoroplethChart
   * @instance
   * @see {@link https://github.com/mbostock/d3/wiki/Geo-Paths#path d3.geo.path}
   * @return {d3.geo.path}
   */
  _chart.geoPath = function() {
    return _geoPath
  }

  /**
   * Remove a GeoJson layer from this chart by name
   * @name removeGeoJson
   * @memberof dc.geoChoroplethChart
   * @instance
   * @param {String} name
   * @return {dc.geoChoroplethChart}
   */
  _chart.removeGeoJson = function(name) {
    const geoJsons = []

    for (let i = 0; i < _geoJsons.length; ++i) {
      const layer = _geoJsons[i]
      if (layer.name !== name) {
        geoJsons.push(layer)
      }
    }

    _geoJsons = geoJsons

    return _chart
  }
  /* OVERRIDE ---------------------------------------------------------------- */
  function showPopup(d, i, data) {
    const popup = _chart.popup()

    const popupBox = popup.select(".chart-popup-content").html("")

    popupBox
      .append("div")
      .attr("class", "popup-legend")
      .style(
        "background-color",
        _chart.getColor(data[geoJson(0).keyAccessor(d)], i)
      )

    popupBox
      .append("div")
      .attr("class", "popup-value")
      .html(() => {
        const key = getKey(0, d)
        const value = isNaN(data[key]) ? "N/A" : _chart.measureValue(data[key])
        return (
          '<div class="popup-value-dim">' +
          key +
          '</div><div class="popup-value-measure">' +
          value +
          "</div>"
        )
      })

    popup.classed("js-showPopup", true)
  }

  function hidePopup() {
    _chart.popup().classed("js-showPopup", false)
  }

  function positionPopup() {
    let coordinates = [0, 0]
    coordinates = _chart.popupCoordinates(d3.mouse(this))
    const x = coordinates[0]
    const y = coordinates[1] - 16
    const popup = _chart
      .popup()
      .attr("style", () => "transform:translate(" + x + "px," + y + "px)")

    popup.select(".chart-popup-box").classed("align-right", function() {
      return (
        x +
          d3
            .select(this)
            .node()
            .getBoundingClientRect().width >
        _chart.width()
      )
    })
  }
  /* ------------------------------------------------------------------------- */

  return _chart.anchor(parent, chartGroup)
}
