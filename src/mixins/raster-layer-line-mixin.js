import {
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega";
import {lastFilteredSize, setLastFilteredSize} from "../core/core-async";
import {parser} from "../utils/utils";
import * as d3 from "d3";
import {AABox2d, Point2d, PolyLine} from "@mapd/mapd-draw/dist/mapd-draw";
import wellknown from "wellknown";

// NOTE: Reqd until ST_Transform supported on projection columns
function conv4326To900913(x, y) {
  const transCoord = [0.0, 0.0]
  transCoord[0] = x * 111319.49077777777778
  transCoord[1] =
    Math.log(Math.tan((90.0 + y) * 0.00872664625997)) * 6378136.99911215736947
  return transCoord
}

const AUTOSIZE_DOMAIN_DEFAULTS = [100000, 0]
const AUTOSIZE_RANGE_DEFAULTS = [1.0, 3.0]
const AUTOSIZE_RANGE_MININUM = [1, 1]
const SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM = 1500000

function getSizing(
  sizeAttr,
  cap,
  lastFilteredSize = cap,
  pixelRatio,
  layerName
) {
  if (typeof sizeAttr === "number") {
    return sizeAttr
  } else if (typeof sizeAttr === "object" && sizeAttr.type === "quantitative") {
    return {
      scale: getSizeScaleName(layerName),
      field: "strokeWidth"
    }
  } else if (sizeAttr === "auto") {
    const size = Math.min(lastFilteredSize, cap)
    const dynamicRScale = d3.scale
      .sqrt()
      .domain(AUTOSIZE_DOMAIN_DEFAULTS)
      .range(
        size > SIZING_THRESHOLD_FOR_AUTOSIZE_RANGE_MININUM
          ? AUTOSIZE_RANGE_MININUM
          : AUTOSIZE_RANGE_DEFAULTS
      )
      .clamp(true)
    return Math.round(dynamicRScale(size) * pixelRatio)
  } else {
    return null
  }
}

function getSizeScaleName(layerName) {
  return `${layerName}_strokeWidth`
}

function getColorScaleName(layerName) {
  return `${layerName}_strokeColor`
}

function getColor(color, layerName) {
  if (
    typeof color === "object" &&
    (color.type === "ordinal" || color.type === "quantitative")
  ) {
    return {
      scale: getColorScaleName(layerName),
      field: "strokeColor"
    }
  }else {
    return color
  }
}

function getTransforms(
  table,
  filter,
  globalFilter,
  state,
  lastFilteredSize
) {
  const transforms = []
  const { transform } = state
  const { size, color, geocol } = state.encoding
  const rowIdTable = doJoin() ? state.data[1].table : state.data[0].table

  const fields = []
  const alias = []
  const ops = []

  const colorProjection =
    color.type === "quantitative"
      ? parser.parseExpression(color.aggregate)
      : `SAMPLE(${rowIdTable}.${color.field})`

  function doJoin() {
    return state.data.length > 1
  }

  if (typeof size === "object" && size.type === "quantitative") {
    if(doJoin()) {
      fields.push(`${state.data[0].table}.${size.field}`)
      alias.push("strokeWidth")
      ops.push(size.aggregate)
    } else {
      transforms.push({
        type: "project",
        expr: size.field,
        as: "strokeWidth"
      })
    }
  }

  if (
    typeof color === "object" &&
    (color.type === "quantitative" || color.type === "ordinal")
  ) {
    if(doJoin()) {
      fields.push(colorProjection)
      alias.push("strokeColor")
      ops.push(null)
    } else {
      transforms.push({
        type: "project",
        expr: color.type === "quantitative" ? color.aggregate.field : color.field,
        as: "strokeColor"
      })
    }
  }

  if (doJoin()) {
    transforms.push({
      type: "filter",
      expr: `${state.data[0].table}.${state.data[0].attr} = ${
        state.data[1].table
        }.${state.data[1].attr}`
    })
  }


  const groupby = doJoin()
    ? {
      type: "project",
      expr: `${state.data[0].table}.${state.data[0].attr}`,
      as: "key0"
    }
    : {}


  if(doJoin() && (size !== "auto" || color.type !== "solid")) {
    transforms.push({
      type: "aggregate",
      fields,
      ops,
      as: alias,
      groupby
    })
    transforms.push({
      type: "project",
      expr: `LAST_SAMPLE(${rowIdTable}.rowid)`,
      as: "rowid"
    })
    transforms.push({
      type: "project",
      expr: `SAMPLE(${table}.${geocol})`,
      as: geocol
    })
  } else {
    transforms.push({
      type: "project",
      expr: `${rowIdTable}.rowid`,
      as: "rowid"
    })
    transforms.push({
      type: "project",
      expr: `${table}.${geocol}`
    })
  }

  if (typeof transform.limit === "number") {
    if (transform.sample) {
      transforms.push({
        type: "sample",
        method: "multiplicative",
        size: lastFilteredSize || transform.tableSize,
        limit: transform.limit
      })
    }
  }

  if (typeof filter === "string" && filter.length) {
    transforms.push({
      type: "filter",
      expr: filter
    })
  }

  if (typeof globalFilter === "string" && globalFilter.length) {
    transforms.push({
      type: "filter",
      expr: globalFilter
    })
  }

  return transforms
}

function getScales({ size, color }, layerName, scaleDomainFields, xformDataSource) {
  const scales = []

  if (typeof size === "object" && size.type === "quantitative") {
    scales.push({
      name: getSizeScaleName(layerName),
      type: "linear",
      domain: (size.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.size} : size.domain),
      range: size.range,
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "ordinal") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "ordinal",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain),
      range: color.range,
      default: color.range[color.range.length - 1],
      nullValue: "#CACACA"
    })
  }

  if (typeof color === "object" && color.type === "quantitative") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "quantize",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain),
      range: color.range,
      nullValue: "#CACACA"
    })
  }

  return scales
}

export default function rasterLayerLineMixin(_layer) {
  let state = null
  _layer.colorDomain = createRasterLayerGetterSetter(_layer, null)
  _layer.sizeDomain = createRasterLayerGetterSetter(_layer, null)

  _layer.setState = function(setter) {
    if (typeof setter === "function") {
      state = setter(state)
    } else {
      state = setter
    }

    if (!state.hasOwnProperty("transform")) {
      state.transform = {}
    }

    return _layer
  }

  _layer.getState = function() {
    return state
  }

  _layer.getProjections = function() {
    return getTransforms(
      "",
      "",
      "",
      state,
      lastFilteredSize(_layer.crossfilter().getId())
    )
      .filter(
        transform =>
          transform.type === "project" && transform.hasOwnProperty("as")
      )
      .map(projection => parser.parseTransform({ select: [] }, projection))
      .map(sql => sql.select[0])
  }

  function getAutoColorVegaTransforms(aggregateNode) {
    const rtnobj = {transforms: [], fields: []}
    if (state.encoding.color.type === "quantitative") {
      const minoutput = "mincolor", maxoutput = "maxcolor"
      aggregateNode.fields = aggregateNode.fields.concat(["strokeColor", "strokeColor", "strokeColor", "strokeColor"])
      aggregateNode.ops = aggregateNode.ops.concat(["min", "max", "avg", "stddev"])
      aggregateNode.as = aggregateNode.as.concat(["mincol", "maxcol", "avgcol", "stdcol"])
      rtnobj.transforms.push(
        {
          type: "formula",
          expr: "max(mincol, avgcol-2*stdcol)",
          as: minoutput
        },
        {
          type: "formula",
          expr: "min(maxcol, avgcol+2*stdcol)",
          as: maxoutput
        }
      )
      rtnobj.fields = [minoutput, maxoutput]
    } else if (state.encoding.color.type === "ordinal") {
      const output = "distinctcolor"
      aggregateNode.fields.push("color")
      aggregateNode.ops.push("distinct")
      aggregateNode.as.push(output)
      rtnobj.fields.push(output)
    }
    return rtnobj
  }

  function usesAutoColors() {
    return state.encoding.color.domain === "auto"
  }

  _layer._updateFromMetadata = (metadata, layerName = "") => {
    if (usesAutoColors() && Array.isArray(metadata.scales)) {
      const colorScaleName = getColorScaleName(layerName)
      for (const scale of metadata.scales) {
        if (scale.name === colorScaleName) {
          _layer.colorDomain(scale.domain)
        }
      }
    }
  }

  _layer.__genVega = function({
                                table,
                                filter,
                                lastFilteredSize,
                                globalFilter,
                                pixelRatio,
                                layerName,
                                useProjection
                              }) {
    const autocolors = usesAutoColors()
    const getStatsLayerName = () => layerName + "_stats"

    const size = getSizing(
      state.encoding.size,
      state.transform && state.transform.limit,
      lastFilteredSize,
      pixelRatio,
      layerName
    )

    const data = [
      {
        name: layerName,
        format: {
          type: "lines",
          coords: {
            x: [state.encoding.geocol],
            y: [{"from": state.encoding.geocol}]
          },
          "layout": "interleaved"
        },
        sql: parser.writeSQL({
          type: "root",
          source: [...new Set(state.data.map(source => source.table))].join(
            ", "
          ),
          transform: getTransforms(
            table,
            filter,
            globalFilter,
            state,
            lastFilteredSize
          )
        })
      }
    ]

    const scaledomainfields = {}

    if (autocolors) {
      const aggregateNode = {
        type: "aggregate",
        fields: [],
        ops: [],
        as: []
      }
      let transforms = [aggregateNode]
      if (autocolors) {
        const xformdata = getAutoColorVegaTransforms(aggregateNode)
        scaledomainfields.color = xformdata.fields
        transforms = transforms.concat(xformdata.transforms)
      }

      data.push({
        name: getStatsLayerName(),
        source: layerName,
        transform: transforms
      })
    }

    const scales = getScales(state.encoding, layerName, scaledomainfields, getStatsLayerName())

    const marks = [
      {
        type: "lines",
        from: {
          data: layerName
        },
        properties: Object.assign(
          {},
          {
            x: {
              field: "x"
            },
            y: {
              field: "y"
            },
            strokeColor: getColor(state.encoding.color, layerName),
            opacity: state.mark.opacity, // gets updated when opacity slider changes
            strokeWidth: size,
            lineJoin:
              typeof state.mark === "object" ? state.mark.lineJoin : "miter",
            miterLimit:
              typeof state.mark === "object" ? state.mark.miterLimit : 10
          }
        )
      }
    ]

    if (useProjection) {
      marks[0].transform = {
        projection: "mercator_map_projection"
      }
    } else {
      marks[0].properties.x.scale = "x"
      marks[0].properties.y.scale = "y"
    }

    return {
      data,
      scales,
      marks
    }
  }

  _layer.polyDim = createRasterLayerGetterSetter(_layer, null)

  createVegaAttrMixin(_layer, "size", 3, 1, true)

  let _vega = null
  const _scaledPopups = {}
  const _minMaxCache = {}
  let _cf = null

  _layer.crossfilter = function(cf) {
    if (!arguments.length) {
      return _cf
    }
    _cf = cf
    return _layer
  }

  _layer._requiresCap = function() {
    return false
  }

  _layer.polyRangeFilter = function(range) {
    if (!_layer.polyDim()) {
      throw new Error("Must set layer's xDim before invoking xRange")
    }

    const polyValue = _layer.polyDim().value()[0]

    if (!arguments.length) {
      return _minMaxCache[polyValue]
    }

    _minMaxCache[polyValue] = range
    return _layer
  }

  _layer._genVega = function(chart, layerName, group, query) {

    // needed to set LastFilteredSize when linemap map first initialized
    if (
      _layer.polyDim()
    ) {
      _layer.polyDim().groupAll().valueAsync().then(value => {
        setLastFilteredSize(_layer.crossfilter().getId(), value)
      })
    }

    _vega = _layer.__genVega({
      layerName,
      table: _layer.crossfilter().getTable()[0],
      filter: _layer.crossfilter().getFilterString(),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      lastFilteredSize: lastFilteredSize(_layer.crossfilter().getId()),
      pixelRatio: chart._getPixelRatio(),
      useProjection: chart._useGeoTypes
    })

    return _vega
  }

  const renderAttributes = [
    "x",
    "y",
    "strokeColor",
    "strokeWidth",
    "lineJoin",
    "miterLimit",
    "opacity"
  ]

  _layer._addRenderAttrsToPopupColumnSet = function(chart, popupColsSet) {
    // add the poly geometry to the query

    if (chart._useGeoTypes) {
      if (state.encoding.geocol) {
        popupColsSet.add(state.encoding.geocol)
      }
    }

    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      renderAttributes.forEach(rndrProp => {
        if (rndrProp !== "x" && rndrProp !== "y") {
          _layer._addQueryDrivenRenderPropToSet(
            popupColsSet,
            _vega.marks[0].properties,
            rndrProp
          )
        }
      })
    }
  }

  _layer._areResultsValidForPopup = function(results) {
    if (state.encoding.geocol && results[state.encoding.geocol]) {
      return true
    }
    return false
  }


  class PolySvgFormatter {
    /**
     * Builds the bounds from the incoming poly data
     * @param {AABox2d} out AABox2d to return
     * @param {object} data Object with return data from getResultRowForPixel()
     * @param {Number} width Width of the visualization div
     * @param {Number} height Height of the visualization div
     * @param {object} margin Margins of the visualization div
     * @param {Function} xscale d3 scale in x dimension from world space to pixel space (i.e. mercatorx-to-pixel)
     * @param {Function} yscale d3 scale in y dimension from world space to pixel space (i.e. mercatory-to-pixel)
     */
    getBounds(data, width, height, margins, xscale, yscale) {
      throw new Error("This must be overridden")
    }

    /**
     * Builds the svg path string to use with the d svg attr:
     * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
     * This function should be called after the getBounds().
     * The t/s arguments are the transformations to properly place the points underneath
     * a parent SVG group node. That node is what ultimately handles animations and such
     * so we need to transform all the points into local space. t is the translation
     * and s is the scale to transform the points from pixel space to model/object space.
     * @param {string} out Returns the svg path string
     * @param {Point2d} t Translation from world to object space.
     * @param {Number} s Scale from world to object space.
     */
    getSvgPath(t, s) {
      throw new Error("This must be overridden")
    }
  }

  function buildGeoProjection(
    width,
    height,
    margins,
    xscale,
    yscale,
    clamp = true,
    t = [0, 0],
    s = 1
  ) {
    let _translation = t,
      _scale = s,
      _clamp = clamp

    const project = d3.geo.transform({
      point(lon, lat) {
        const projectedCoord = conv4326To900913(lon, lat)
        const pt = [
          _scale * (xscale(projectedCoord[0]) + margins.left - _translation[0]),
          _scale *
          (height -
            yscale(projectedCoord[1]) -
            1 +
            margins.top -
            _translation[1])
        ]
        if (_clamp) {
          if (pt[0] >= 0 && pt[0] < width && pt[1] >= 0 && pt[1] < height) {
            return this.stream.point(pt[0], pt[1])
          }
        } else {
          return this.stream.point(pt[0], pt[1])
        }
      }
    })

    project.setTransforms = (t, s) => {
      _translation = t
      _scale = s
    }

    project.setClamp = clamp => {
      _clamp = Boolean(clamp)
    }

    return project
  }

  class GeoSvgFormatter extends PolySvgFormatter {
    constructor(geocol) {
      super()
      this._geojson = null
      this._projector = null
      this._d3projector = null
      this._geocol = geocol
    }

    getBounds(data, width, height, margins, xscale, yscale) {
      const wkt = data[this._geocol]
      if (typeof wkt !== "string") {
        throw new Error(
          `Cannot create SVG from geo polygon column "${
            this._geocol
            }". The data returned is not a WKT string. It is of type: ${typeof wkt}`
        )
      }
      this._geojson = wellknown.parse(wkt)
      this._projector = buildGeoProjection(
        width,
        height,
        margins,
        xscale,
        yscale,
        true
      )

      // NOTE: d3.geo.path() streaming requires polygons to duplicate the first vertex in the last slot
      // to complete a full loop. If the first vertex is not duplicated, the last vertex can be dropped.
      // This is currently a requirement for the incoming WKT string, but is not error checked by d3.
      this._d3projector = d3.geo.path().projection(this._projector)
      const d3bounds = this._d3projector.bounds(this._geojson)
      return AABox2d.create(
        d3bounds[0][0],
        d3bounds[0][1],
        d3bounds[1][0],
        d3bounds[1][1]
      )
    }

    getSvgPath(t, s) {
      this._projector.setTransforms(t, s)
      this._projector.setClamp(false)
      return this._d3projector(this._geojson)
    }
  }

  _layer._displayPopup = function(
    chart,
    parentElem,
    data,
    width,
    height,
    margins,
    xscale,
    yscale,
    minPopupArea,
    animate
  ) {
    let geoPathFormatter = null
    if (chart._useGeoTypes) {
      if (!state.encoding.geocol) {
        throw new Error(
          "No linestring column specified. Cannot build linestring popup."
        )
      }
      geoPathFormatter = new GeoSvgFormatter(state.encoding.geocol)
    }

    const bounds = geoPathFormatter.getBounds(
      data,
      width,
      height,
      margins,
      xscale,
      yscale
    )

    // Check for 2 special cases:
    // 1) zoomed in so far in that the poly encompasses the entire view, so all points are
    //    outside the view
    // 2) the poly only has 1 point in view.
    // Both cases can be handled by checking whether the bounds is empty (infinite) in
    // either x/y or the bounds size is 0 in x/y.
    const boundsSz = AABox2d.getSize(Point2d.create(), bounds)
    if (!isFinite(boundsSz[0]) || boundsSz[0] === 0) {
      bounds[AABox2d.MINX] = 0
      bounds[AABox2d.MAXX] = width
      boundsSz[0] = width
    }
    if (!isFinite(boundsSz[1]) || boundsSz[1] === 0) {
      bounds[AABox2d.MINY] = 0
      bounds[AABox2d.MAXY] = height
      boundsSz[1] = height
    }

    // Get the data from the hit-test object used to drive render properties
    // These will be used to properly style the svg popup object
    const rndrProps = {}
    if (
      _vega &&
      Array.isArray(_vega.marks) &&
      _vega.marks.length > 0 &&
      _vega.marks[0].properties
    ) {
      const propObj = _vega.marks[0].properties
      renderAttributes.forEach(prop => {
        if (
          typeof propObj[prop] === "object" &&
          propObj[prop].field &&
          typeof propObj[prop].field === "string"
        ) {
          rndrProps[prop] = propObj[prop].field
        }
      })
    }

    // If the poly we hit-test is small, we'll scale it so that it
    // can be seen. The minPopupArea is the minimum area of the popup
    // poly, so if the poly's bounds is < minPopupArea, we'll scale it
    // up to that size.
    let scale = 1
    const scaleRatio = minPopupArea / AABox2d.area(bounds)
    const isScaled = scaleRatio > 1
    if (isScaled) {
      scale = Math.sqrt(scaleRatio)
    }

    // Now grab the style properties for the svg calculated from the vega
    const popupStyle = _layer.popupStyle()
    let strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor])
    let strokeWidth = 1
    if (typeof popupStyle === "object" && !isScaled) {
      strokeColor = popupStyle.strokeColor || strokeColor
      strokeWidth = popupStyle.strokeWidth
    }

    // build out the svg
    const svg = parentElem
      .append("svg")
      .attr("width", width)
      .attr("height", height)

    // transform svg node. This node will position the svg appropriately. Need
    // to offset according to the scale above (scale >= 1)
    const boundsCtr = AABox2d.getCenter(Point2d.create(), bounds)

    const xform = svg
      .append("g")
      .attr("class", "map-polyline")
      .attr(
        "transform",
        "translate(" +
        (scale * bounds[AABox2d.MINX] - (scale - 1) * boundsCtr[0]) +
        ", " +
        (scale * (bounds[AABox2d.MINY] + 1) -
          (scale - 1) * (boundsCtr[1] + 1)) +
        ")"
      )

    // now add a transform node that will be used to apply animated scales to
    // We want the animation to happen from the center of the bounds, so we
    // place the transform origin there.
    const group = xform
      .append("g")
      .attr("class", "map-polyline")
      .attr("transform-origin", `${boundsSz[0] / 2} ${boundsSz[1] / 2}`)

    // inherited animation classes from css
    if (animate) {
      if (isScaled) {
        group.classed("popupPoly", true)
      } else {
        group.classed("fadeInPoly", true)
      }
    }

    // now apply the styles
    if (typeof strokeWidth === "number") {
      group.style("stroke-width", strokeWidth)
    }

    // applying shadow
    const defs = group
      .append('defs')

    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("width", "200%")
      .attr("height", "200%");

    filter.append("feOffset")
      .attr("in", "SourceAlpha")
      .attr("result", "offOut")
      .attr("dx", "2")
      .attr("dy", "2");

    filter.append("feGaussianBlur")
      .attr("in", "offOut")
      .attr("stdDeviation", 2)
      .attr("result", "blurOut");


    filter.append("feBlend")
      .attr("in", "SourceGraphic")
      .attr("in2", "blurOut")
      .attr("mode", "normal")

    group
      .append("path")
      .attr(
        "d",
        geoPathFormatter.getSvgPath(
          Point2d.create(bounds[AABox2d.MINX], bounds[AABox2d.MINY]),
          scale
        )
      )
      .attr("class", "map-polyline")
      .attr("fill", 'none')
      .attr("stroke-width", strokeWidth)
      .attr("stroke", strokeColor)
      .style("filter", "url(#drop-shadow)")

    _scaledPopups[chart] = isScaled

    return bounds
  }

  _layer._destroyLayer = function(chart) {
    const polyDim = _layer.polyDim()
    if (polyDim) {
      polyDim.dispose()
    }
  }

  return _layer
}