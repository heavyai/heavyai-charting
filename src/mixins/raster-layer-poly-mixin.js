import {adjustOpacity, createRasterLayerGetterSetter, createVegaAttrMixin} from "../utils/utils-vega"
import {parser} from "../utils/utils"

const vegaLineJoinOptions = ["miter", "round", "bevel"]
const polyTableGeomColumns = {
    // NOTE: the verts are interleaved x,y, so verts[0] = vert0.x, verts[1] = vert0.y, verts[2] = vert1.x, verts[3] = vert1.y, etc.
  verts: "mapd_geo_coords",
  indices: "mapd_geo_indices",

    // NOTE: the line draw info references the line loops in the verts. This struct looks like the following:
    // {
    //     count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
    //     instanceCount, // should always be 1
    //     firstIndex,    // the index in verts (includes x & y) where the verts for the loop start
    //     baseInstance   // irrelevant for our purposes -- should always be 0
    // }
  linedrawinfo: "mapd_geo_linedrawinfo",
  polydrawinfo: "mapd_geo_polydrawinfo"
}

function validateLineJoin (newLineJoin, currLineJoin) {
  if (typeof newLineJoin !== "string") {
    throw new Error("Line join must be a string and must be one of " + vegaLineJoinOptions.join(", "))
  }
  const lowCase = newLineJoin.toLowerCase()
  if (vegaLineJoinOptions.indexOf(lowCase) < 0) {
    throw new Error("Line join must be a string and must be one of " + vegaLineJoinOptions.join(", "))
  }
  return lowCase
}

function validateMiterLimit (newMiterLimit, currMiterLimit) {
  if (typeof newMiterLimit !== "number") {
    throw new Error("Miter limit must be a number.")
  } else if (newMiterLimit < 0) {
    throw new Error("Miter limit must be >= 0")
  }
}

export default function rasterLayerPolyMixin (_layer) {
  _layer.crossfilter = createRasterLayerGetterSetter(_layer, null)

  createVegaAttrMixin(_layer, "lineJoin", vegaLineJoinOptions[0], vegaLineJoinOptions[0], false, {
    preDefault: validateLineJoin,
    preNull: validateLineJoin
  })

  createVegaAttrMixin(_layer, "miterLimit", 10, 10, false, {
    preDefault: validateMiterLimit,
    preNull: validateMiterLimit
  })

  let state = null
  let _vega = null
  const _cf = null

  const _scaledPopups = {}

  _layer.setState = function (setter) {
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

  _layer.getState = function () {
    return state
  }

  function getTransforms ({filter, globalFilter}) {
    const transforms = [
      {
        type: "rowid",
        table: state.data[1].table
      },
      {
        type: "project",
        expr: state.encoding.color.aggregrate,
        as: "color"
      },
      {
        type: "filter",
        expr: `${state.data[0].table}.${state.data[0].attr} = ${state.data[1].table}.${state.data[1].attr}`
      },
      {
        type: "sort",
        field: ["color"]
      }
    ]

    if (typeof state.transform.limit === "number") {
      transforms.push({
        type: "limit",
        row: state.transform.limit
      })
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

  _layer.__genVega = function ({filter, globalFilter, layerName}) {
    return {
      data: {
        name: layerName,
        format: "polys",
        shapeColGroup: "mapd",
        sql: parser.writeSQL({
          type: "root",
          source: state.data.map(source => source.table).join(", "),
          transform: getTransforms({filter, globalFilter})
        })
      },
      scales: [
        {
          name: layerName + "_fillColor",
          type: "linear",
          domain: state.encoding.color.domain,
          range: state.encoding.color.range.map(c => adjustOpacity(c, state.encoding.color.opacity)),
          default: "green",
          nullValue: "#CACACA",
          clamp: false
        }
      ],
      mark: {
        type: "polys",
        from: {
          data: layerName
        },
        properties: {
          x: {
            scale: "x",
            field: "x"
          },
          y: {
            scale: "y",
            field: "y"
          },
          fillColor: {
            scale: layerName + "_fillColor",
            field: "color"
          },
          strokeColor: typeof state.mark === "object" ? state.mark.strokeColor : "white",
          strokeWidth: typeof state.mark === "object" ? state.mark.strokeWidth : 0,
          lineJoin: typeof state.mark === "object" ? state.mark.lineJoin : "miter",
          miterLimit: typeof state.mark === "object" ? state.mark.miterLimit : 10
        }
      }
    }
  }

  _layer._requiresCap = function () {
        // polys don't require a cap
    return false
  }

  _layer._genVega = function (chart, layerName, group, query) {
    _vega = _layer.__genVega({
      layerName,
      filter: _layer.crossfilter().getFilterString(),
      globalFilter: _layer.crossfilter().getGlobalFilterString()
    })
    return _vega
  }

  const renderAttributes = ["x", "y", "fillColor", "strokeColor", "strokeWidth", "lineJoin", "miterLimit"]


  _layer._addRenderAttrsToPopupColumnSet = function (chart, popupColsSet) {
    popupColsSet.add(polyTableGeomColumns.verts) // add the poly geometry to the query
    popupColsSet.add(polyTableGeomColumns.linedrawinfo) // need to get the linedrawinfo beause there can be
                                                        // multiple polys per row, and linedrawinfo will
                                                        // tell us this

    if (_vega && _vega.mark && _vega.mark.properties) {
      renderAttributes.forEach(rndrProp => {
        if (rndrProp !== "x" && rndrProp !== "y") {
          _layer._addQueryDrivenRenderPropToSet(popupColsSet, _vega.mark.properties, rndrProp)
        }
      })

    }
  }

  _layer._areResultsValidForPopup = function (results) {
    if (results[polyTableGeomColumns.verts] && results[polyTableGeomColumns.linedrawinfo]) {
      return true
    }
    return false
  }

  _layer._displayPopup = function (chart, parentElem, data, width, height, margins, xscale, yscale, minPopupArea, animate) {
        // verts and drawinfo should be valid as the _resultsAreValidForPopup()
        // method should've been called beforehand
    const verts = data[polyTableGeomColumns.verts]
    const drawinfo = data[polyTableGeomColumns.linedrawinfo]

    const polys = []

        // TODO(croot): when the bounds is added as a column to the poly db table, we
        // can just use those bounds rather than build our own
        // But until then, we need to build our own bounds -- we use this to
        // find the reasonable center of the geom and scale from there when
        // necessary

        // bounds: [minX, maxX, minY, maxY]
    const bounds = [Infinity, -Infinity, Infinity, -Infinity]
    const startIdxDiff = (drawinfo.length ? drawinfo[2] : 0)

    for (let i = 0; i < drawinfo.length; i = i + 4) {
            // Draw info struct:
            //     0: count,         // number of verts in loop -- might include 3 duplicate verts at end for closure
            //     1: instanceCount, // should always be 1
            //     2: firstIndex,    // the start index (includes x & y) where the verts for the loop start
            //     3: baseInstance   // irrelevant for our purposes -- should always be 0
      const polypts = []
      const count = (drawinfo[i] - 3) * 2 // include x&y, and drop 3 duplicated pts at the end
      const startIdx = (drawinfo[i + 2] - startIdxDiff) * 2 // include x&y
      const endIdx = startIdx + count // remove the 3 duplicate pts at the end
      for (let idx = startIdx; idx < endIdx; idx = idx + 2) {
        const screenX = xscale(verts[idx]) + margins.left
        const screenY = height - yscale(verts[idx + 1]) - 1 + margins.top

        if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
          if (bounds[0] === Infinity) {
            bounds[0] = screenX
            bounds[1] = screenX
            bounds[2] = screenY
            bounds[3] = screenY
          } else {
            if (screenX < bounds[0]) {
              bounds[0] = screenX
            } else if (screenX > bounds[1]) {
              bounds[1] = screenX
            }

            if (screenY < bounds[2]) {
              bounds[2] = screenY
            } else if (screenY > bounds[3]) {
              bounds[3] = screenY
            }
          }
        }
        polypts.push(screenX)
        polypts.push(screenY)
      }

      polys.push(polypts)
    }

    if (bounds[0] === Infinity) {
      bounds[0] = 0
    }
    if (bounds[1] === -Infinity) {
      bounds[1] = width
    }
    if (bounds[2] === Infinity) {
      bounds[2] = 0
    }
    if (bounds[3] === -Infinity) {
      bounds[3] = height
    }

        // NOTE: we could hit the case where the bounds is 0
        // if 1 point is visible in screen
        // Handle that here
    if (bounds[0] === bounds[1]) {
      bounds[0] = 0
      bounds[1] = width
    }
    if (bounds[2] === bounds[3]) {
      bounds[2] = 0
      bounds[3] = height
    }

    const rndrProps = {}
    const queryRndrProps = new Set([polyTableGeomColumns.verts, polyTableGeomColumns.linedrawinfo])
    if (_vega && _vega.mark && _vega.mark.properties) {
      const propObj = _vega.mark.properties
      renderAttributes.forEach(prop => {
        if (
          typeof propObj[prop] === "object" && propObj[prop].field && typeof propObj[prop].field === "string"
        ) {
          rndrProps[prop] = propObj[prop].field
          queryRndrProps.add(propObj[prop].field)
        }
      })
    }

    const boundsWidth = bounds[1] - bounds[0]
    const boundsHeight = bounds[3] - bounds[2]
    let scale = 1
    const scaleRatio = minPopupArea / (boundsWidth * boundsHeight)
    const isScaled = (scaleRatio > 1)
    if (isScaled) {
      scale = Math.sqrt(scaleRatio)
    }

    const popupStyle = _layer.popupStyle()
    let fillColor = _layer.getFillColorVal(data[rndrProps.fillColor])
    let strokeColor = _layer.getStrokeColorVal(data[rndrProps.strokeColor])
    let strokeWidth
    if (typeof popupStyle === "object" && !isScaled) {
      fillColor = popupStyle.fillColor || fillColor
      strokeColor = popupStyle.strokeColor || strokeColor
      strokeWidth = popupStyle.strokeWidth
    }


    const svg = parentElem.append("svg")
                          .attr("width", width)
                          .attr("height", height)

    const xform = svg.append("g")
                       .attr("class", "map-poly-xform")
                       .attr("transform", "translate(" + (scale * bounds[0] - (scale - 1) * (bounds[0] + (boundsWidth / 2))) + ", " + (scale * (bounds[2] + 1) - (scale - 1) * (bounds[2] + 1 + (boundsHeight / 2))) + ")")

    const group = xform.append("g")
                         .attr("class", "map-poly")
                         .attr("transform-origin", (boundsWidth / 2), (boundsHeight / 2))
                         .style("fill", fillColor)
                         .style("stroke", strokeColor)

    if (typeof strokeWidth === "number") {
      group.style("stroke-width", strokeWidth)
    }

    if (animate) {
      if (isScaled) {
        group.classed("popupPoly", true)
      } else {
        group.classed("fadeInPoly", true)
      }
    }

    polys.forEach((pts) => {
      if (!pts) {
        return
      }

      let pointStr = ""
      for (let i = 0; i < pts.length; i = i + 2) {
        pointStr = pointStr + ((scale * (pts[i] - bounds[0])) + " " + (scale * (pts[i + 1] - bounds[2])) + ", ")
      }
      pointStr = pointStr.slice(0, pointStr.length - 2)

      group.append("polygon")
                 .attr("points", pointStr)
    })

    _scaledPopups[chart] = isScaled

    return {
      posX: bounds[0] + (boundsWidth / 2),
      posY: bounds[2] + (boundsHeight / 2),
      rndrPropSet: queryRndrProps,
      bounds
    }
  }

  _layer._hidePopup = function (chart, hideCallback) {
    const mapPoly = chart.select(".map-poly")
    if (mapPoly) {

      if (_scaledPopups[chart]) {
        mapPoly.classed("removePoly", true)
      } else {
        mapPoly.classed("fadeOutPoly", true)
                // mapPoly.attr('transform', 'scale(0, 0)');
      }

      if (hideCallback) {
        mapPoly.on("animationend", () => {
          hideCallback(chart)
        })
      }

      delete _scaledPopups[chart]
    }
  }

  _layer._destroyLayer = function (chart) {
    // deleteCanvas(chart)
  }

  return _layer
}
