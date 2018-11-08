import d3 from "d3"
import wellknown from "wellknown";
import {AABox2d, Point2d, PolyLine} from "@mapd/mapd-draw/dist/mapd-draw";
export function notNull(value) {
  return value != null /* double-equals also catches undefined */
}

export function adjustOpacity(color, opacity = 1) {
  if (!/#/.test(color)) {
    return color
  }
  const hex = color.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function adjustRGBAOpacity(rgba, opacity) {
  let [r, g, b, a] = rgba
    .split("(")[1]
    .split(")")[0]
    .split(",")
  if (a) {
    const relativeOpacity = parseFloat(a) - (1 - opacity)
    a = `${relativeOpacity > 0 ? relativeOpacity : 0.01}`
  } else {
    a = opacity
  }
  return `rgba(${r},${g},${b},${a})`
}

const ordScale = d3.scale.ordinal()
const quantScale = d3.scale.quantize()

const capAttrMap = {
  FillColor: "color",
  Size: "size"
}

export function createVegaAttrMixin(
  layerObj,
  attrName,
  defaultVal,
  nullVal,
  useScale,
  prePostFuncs
) {
  let scaleFunc = "",
    fieldAttrFunc = ""
  const capAttrName = attrName.charAt(0).toUpperCase() + attrName.slice(1)
  const defaultFunc = "default" + capAttrName
  const nullFunc = "null" + capAttrName
  layerObj[defaultFunc] = createRasterLayerGetterSetter(
    layerObj,
    defaultVal,
    prePostFuncs ? prePostFuncs.preDefault : null,
    prePostFuncs ? prePostFuncs.postDefault : null
  )
  layerObj[nullFunc] = createRasterLayerGetterSetter(
    layerObj,
    nullVal,
    prePostFuncs ? prePostFuncs.preNull : null,
    prePostFuncs ? prePostFuncs.postNull : null
  )

  if (useScale) {
    scaleFunc = attrName + "Scale"
    fieldAttrFunc = attrName + "Attr"
    layerObj[scaleFunc] = createRasterLayerGetterSetter(
      layerObj,
      null,
      prePostFuncs ? prePostFuncs.preScale : null,
      prePostFuncs ? prePostFuncs.postScale : null
    )
    layerObj[fieldAttrFunc] = createRasterLayerGetterSetter(
      layerObj,
      null,
      prePostFuncs ? prePostFuncs.preField : null,
      prePostFuncs ? prePostFuncs.postField : null
    )

    layerObj["_build" + capAttrName + "Scale"] = function(chart, layerName) {
      const scale = layerObj[scaleFunc]()
      if (
        scale &&
        scale.domain &&
        scale.domain().length &&
        scale.range().length &&
        scaleFunc === "fillColorScale"
      ) {
        const colorScaleName = layerName + "_" + attrName
        const rtnObj = {
          name: colorScaleName,
          type: chart._determineScaleType(scale),
          domain: scale.domain().filter(notNull),
          range: scale.range(),
          default: layerObj[defaultFunc](),
          nullValue: layerObj[nullFunc]()
        }

        if (scale.clamp) {
          rtnObj.clamp = scale.clamp()
        }

        return rtnObj
      } else if (layerObj.densityAccumulatorEnabled()) {
        const colorScaleName = layerName + "_" + attrName,
          colorsToUse = layerObj.defaultFillColor(),
          domainInterval = 100 / (colorsToUse.length - 1),
          linearScale = colorsToUse.map((color, i) => i * domainInterval / 100),
          range = colorsToUse.map((color, i, colorArray) => {
            const normVal = i / (colorArray.length - 1)
            let interp = Math.min(normVal / 0.65, 1.0)
            interp = interp * 0.375 + 0.625
            return convertHexToRGBA(color, interp * 100)
          })

        const rtnObj = {
          name: colorScaleName,
          type: "linear",
          domain: linearScale,
          range,
          accumulator: "density",
          minDensityCnt: "-2ndStdDev",
          maxDensityCnt: "2ndStdDev",
          clamp: true
        }

        return rtnObj
      }
    }
  }

  const getValFunc = "get" + capAttrName + "Val"
  layerObj[getValFunc] = function(input) {
    let rtnVal = layerObj[defaultFunc]()
    if (input === null) {
      rtnVal = layerObj[nullFunc]()
    } else if (input !== undefined && useScale) {
      const encodingAttrName = capAttrMap[capAttrName]
      const capAttrObj = layerObj.getState().encoding[encodingAttrName]
      if (
        capAttrObj &&
        capAttrObj.domain &&
        capAttrObj.domain.length &&
        capAttrObj.range.length
      ) {
        let domainVals = capAttrObj.domain
        if (domainVals === "auto") {
          const domainGetterFunc = encodingAttrName + "Domain"
          if (typeof layerObj[domainGetterFunc] !== "function") {
            throw new Error(`Looking for a ${domainGetterFunc} function on for attr ${attrName}`)
          }
          domainVals = layerObj[domainGetterFunc]()
        }
        if (capAttrObj.type === "ordinal") {
          ordScale.domain(domainVals).range(capAttrObj.range)
          rtnVal = ordScale(input)
        } else {
          quantScale.domain(domainVals).range(capAttrObj.range)
          rtnVal = quantScale(input)
        }
      }
    }

    return rtnVal
  }
}

export function createRasterLayerGetterSetter(
  layerObj,
  attrVal,
  preSetFunc,
  postSetFunc
) {
  return function(newVal) {
    if (!arguments.length) {
      return attrVal
    }
    if (preSetFunc) {
      var rtnVal = preSetFunc(newVal, attrVal)
      if (rtnVal !== undefined) {
        newVal = rtnVal
      }
    }
    attrVal = newVal
    if (postSetFunc) {
      var rtnVal = postSetFunc(attrVal)
      if (rtnVal !== undefined) {
        attrVal = rtnVal
      }
    }
    return layerObj
  }
}


// Polygon and line svg on hovering

// NOTE: Reqd until ST_Transform supported on projection columns
function conv4326To900913(x, y) {
  const transCoord = [0.0, 0.0]
  transCoord[0] = x * 111319.49077777777778
  transCoord[1] =
    Math.log(Math.tan((90.0 + y) * 0.00872664625997)) * 6378136.99911215736947
  return transCoord
}

class SvgFormatter {
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

class LegacyPolySvgFormatter extends SvgFormatter {
  constructor() {
    super()
    this._polys = []
  }

  getBounds(data, width, height, margins, xscale, yscale) {
    // NOTE: this is handling legacy poly storage for backwards compatibility.
    // Once we've put everything post 4.0 behind us, this can be fully deprecated.
    //
    // verts and drawinfo should be valid as the _resultsAreValidForPopup()
    // method should've been called beforehand
    const verts = data[polyTableGeomColumns.verts_LEGACY]
    const drawinfo = data[polyTableGeomColumns.linedrawinfo_LEGACY]

    const startIdxDiff = drawinfo.length ? drawinfo[2] : 0
    const FLT_MAX = 1e37

    const bounds = AABox2d.create()
    const screenPt = Point2d.create()
    for (let i = 0; i < drawinfo.length; i = i + 4) {
      // Draw info struct:
      //     0: count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
      //     1: instanceCount, // should always be 1
      //     2: firstIndex,    // the start index (includes x & y) where the verts for the loop start
      //     3: baseInstance   // irrelevant for our purposes -- should always be 0
      let polypts = []
      const count = (drawinfo[i] - 3) * 2 // include x&y, and drop 3 duplicated pts at the end
      const startIdx = (drawinfo[i + 2] - startIdxDiff) * 2 // include x&y
      const endIdx = startIdx + count // remove the 3 duplicate pts at the end
      for (let idx = startIdx; idx < endIdx; idx = idx + 2) {
        if (verts[idx] <= -FLT_MAX) {
          // -FLT_MAX is a separator for multi-polygons (like Hawaii,
          // where there would be a polygon per island), so when we hit a separator,
          // remove the 3 duplicate points that would end the polygon prior to the separator
          // and start a new polygon
          polypts.pop()
          polypts.pop()
          polypts.pop()
          this._polys.push(polypts)
          polypts = []
        } else {
          Point2d.set(
            screenPt,
            xscale(verts[idx]) + margins.left,
            height - yscale(verts[idx + 1]) - 1 + margins.top
          )

          if (
            screenPt[0] >= 0 &&
            screenPt[0] <= width &&
            screenPt[1] >= 0 &&
            screenPt[1] <= height
          ) {
            AABox2d.encapsulatePt(bounds, bounds, screenPt)
          }
          polypts.push(screenPt[0])
          polypts.push(screenPt[1])
        }
      }

      this._polys.push(polypts)
    }

    return bounds
  }

  getSvgPath(t, s) {
    let rtnPointStr = ""
    this._polys.forEach(pts => {
      if (!pts) {
        return
      }

      let pointStr = ""
      for (let i = 0; i < pts.length; i = i + 2) {
        if (!isNaN(pts[i]) && !isNaN(pts[i + 1])) {
          pointStr +=
            (pointStr.length ? "L" : "M") +
            s * (pts[i] - t[0]) +
            "," +
            s * (pts[i + 1] - t[1])
        }
      }
      if (pointStr.length) {
        pointStr += "Z"
      }
      rtnPointStr += pointStr
    })
    return rtnPointStr
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

export class GeoSvgFormatter extends SvgFormatter {
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

export const renderAttributes = [
  "x",
  "y",
  "fillColor",
  "strokeColor",
  "strokeWidth",
  "lineJoin",
  "miterLimit",
  "opacity"
]

const _scaledPopups = {}

export function __displayPopup(svgProps) {
  const {
    chart,
      parentElem,
      data,
      width,
      height,
      margins,
      xscale,
      yscale,
      minPopupArea,
      animate,
      _vega,
      _layer,
      state
  } = svgProps

  const layerType = _layer.layerType()

  let geoPathFormatter = null
  if (chart._useGeoTypes) {
    if (!state.encoding.geocol) {
      throw new Error(
        "No poly/multipolygon column specified. Cannot build poly outline popup."
      )
    }
    geoPathFormatter = new GeoSvgFormatter(state.encoding.geocol)
  } else if (!chart._useGeoTypes && layerType === "polys") {
    geoPathFormatter = new LegacyPolySvgFormatter()
  } else {
    throw new Error(
      "Cannot build outline popup."
    )
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
  let fillColor = _layer.getFillColorVal(data[rndrProps.fillColor])
  let strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor])
  let strokeWidth = 1
  if (typeof popupStyle === "object" && !isScaled) {
    fillColor = popupStyle.fillColor || fillColor
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
    .attr("class", layerType === "polys" ? "map-poly-xform" : "map-polyline")
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
    .attr("class", layerType === "polys" ? "map-poly" : "map-polyline")
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

  if(layerType === "lines") {
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
  }

  group
    .append("path")
    .attr(
      "d",
      geoPathFormatter.getSvgPath(
        Point2d.create(bounds[AABox2d.MINX], bounds[AABox2d.MINY]),
        scale
      )
    )
    .attr("class", layerType === "polys" ? "map-polygon-shape": "map-polyline")
    .attr("fill", layerType === "polys" ? fillColor : "none")
    .attr("fill-rule", "evenodd")
    .attr("stroke-width", strokeWidth)
    .attr("stroke", strokeColor)
    .style("filter", layerType === "polys" ? "none" : "url(#drop-shadow)")
    .on("click", () => {
      if(layerType === "polys") {
        return _layer.onClick(chart, data, d3.event)
      } else {
        return null
      }
     })

  _scaledPopups[chart] = isScaled

  return bounds
}

export function getSizeScaleName(layerName) {
  if(layerName === "linemap") {
    return `${layerName}_strokeWidth`
  } else {
    return `${layerName}_size`
  }
}

export function getColorScaleName(layerName) {
  if(layerName === "linemap") {
    return `${layerName}_strokeColor`
  } else {
    return `${layerName}_fillColor`
  }
}


export function getScales({ size, color }, layerName, scaleDomainFields, xformDataSource) {
  const scales = []

  if (typeof size === "object" && (size.type === "quantitative" || size.type === "custom")) {
    scales.push({
      name: getSizeScaleName(layerName),
      type: "linear",
      domain: (size.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.size} : size.domain),
      range: size.range,
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "density") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "linear",
      domain: color.range.map(
        (c, i) => i * 100 / (color.range.length - 1) / 100
      ),
      range: color.range
        .map(c => adjustOpacity(c, color.opacity))
        .map((c, i, colorArray) => {
          const normVal = i / (colorArray.length - 1)
          let interp = Math.min(normVal / 0.65, 1.0)
          interp = interp * 0.375 + 0.625
          return adjustRGBAOpacity(c, interp)
        }),
      accumulator: "density",
      minDensityCnt: "-2ndStdDev",
      maxDensityCnt: "2ndStdDev",
      clamp: true
    })
  }

  if (typeof color === "object" && color.type === "ordinal") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "ordinal",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain),
      range: color.range.map(c => adjustOpacity(c, color.opacity)),
      default: adjustOpacity(
        color.range[color.range.length - 1], // in current implementation 'Other' is always added as last element in the array
        color.opacity
      ),
      nullValue: adjustOpacity("#CACACA", color.opacity)
    })
  }

  if (typeof color === "object" && color.type === "quantitative") {
    scales.push({
      name: getColorScaleName(layerName),
      type: "quantize",
      domain: (color.domain === "auto" ? {data: xformDataSource, fields: scaleDomainFields.color} : color.domain),
      range: color.range.map(c => adjustOpacity(c, color.opacity))
    })
  }

  return scales
}