import capMixin from "./cap-mixin"
import rasterLayerPointMixin from "./raster-layer-point-mixin"
import rasterLayerPolyMixin from "./raster-layer-poly-mixin"
import rasterLayerHeatmapMixin from "./raster-layer-heatmap-mixin"
import rasterLayerLineMixin from "./raster-layer-line-mixin"
import {
  createRasterLayerGetterSetter,
  createVegaAttrMixin
} from "../utils/utils-vega"
import {AABox2d, Point2d} from "@mapd/mapd-draw/dist/mapd-draw"

const validLayerTypes = ["points", "polys", "heat", "lines"]

export default function rasterLayer(layerType) {
  const _layerType = layerType

  let _dimension = null
  let _group = null
  let _mandatoryAttributes = []

  let _layer = capMixin({
    setDataAsync(callback) {
      // noop.
      // This is to appease mixins that require an object initialized with a baseMixin
    },

    data(callback) {
      // noop.
      // This is to appease mixins that require an object initialized with a baseMixin
    },

    filter() {
      // noop.
      // This is to appease mixins that require an object initialized with a baseMixin
    },

    _mandatoryAttributes(mandatoryAttributes) {
      // needed for layer mixins to control mandatory checks.

      if (!arguments.length) {
        return _mandatoryAttributes
      }
      _mandatoryAttributes = mandatoryAttributes
      return _layer
    }
  })

  _layer.othersGrouper(false) // TODO(croot): what does othersGrouper in capMixin do exactly?
  // Always set to false for now, tho user can override.

  if (layerType === "points") {
    _layer = rasterLayerPointMixin(_layer)
  } else if (layerType === "polys") {
    _layer = rasterLayerPolyMixin(_layer)
  } else if (/heat/.test(layerType)) {
    _layer = rasterLayerHeatmapMixin(_layer)
  } else if (layerType === "lines") {
    _layer = rasterLayerLineMixin(_layer)
  } else {
    throw new Error(
      '"' +
        layerType +
        '" is not a valid layer type. The valid layer types are: ' +
        validLayerTypes.join(", ")
    )
  }

  let _opacity = 1

  // NOTE: builds _layer.defaultFillColor(), _layer.nullFillColor(),
  //              _layer.fillColorScale(), & _layer.fillColorAttr()
  createVegaAttrMixin(_layer, "fillColor", "#22A7F0", "#CACACA", true)

  // NOTE: builds _layer.defaultStrokeColor(), _layer.nullStrokeColor(),
  //              _layer.strokeColorScale(), & _layer.strokeColorAttr()
  createVegaAttrMixin(_layer, "strokeColor", "white", "white", true)

  // NOTE: builds _layer.defaultStrokeWidth(), _layer.nullStrokeWidth(),
  //              _layer.strokeWidthScale(), & _layer.strokeWidthAttr()
  createVegaAttrMixin(_layer, "strokeWidth", 0, 0, true)

  _layer.popupColumns = createRasterLayerGetterSetter(_layer, [])
  _layer.popupColumnsMapped = createRasterLayerGetterSetter(_layer, {})
  _layer.popupFunction = createRasterLayerGetterSetter(_layer, null)
  _layer.popupStyle = createRasterLayerGetterSetter(_layer, {})
  _layer.densityAccumulatorEnabled = createRasterLayerGetterSetter(
    _layer,
    false
  )

  const _popup_wrap_class = "map-popup-wrap-new"
  const _popup_box_class = "map-popup-box-new"
  const _popup_box_item_class = "map-popup-item"
  const _popup_item_key_class = "popup-item-key"
  const _popup_item_val_class = "popup-item-val"
  const _layerPopups = {}

  _layer.layerType = function() {
    return _layerType
  }

  /**
   * **mandatory**
   *
   * Set or get the dimension attribute of a chart. In `dc`, a dimension can be any valid [crossfilter
   * dimension](https://github.com/square/crossfilter/wiki/API-Reference#wiki-dimension).
   *
   * If a value is given, then it will be used as the new dimension. If no value is specified then
   * the current dimension will be returned.
   * @name dimension
   * @memberof dc.baseMixin
   * @instance
   * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#dimension crossfilter.dimension}
   * @example
   * var index = crossfilter([]);
   * var dimension = index.dimension(dc.pluck('key'));
   * chart.dimension(dimension);
   * @param {crossfilter.dimension} [dimension]
   * @return {crossfilter.dimension}
   * @return {dc.baseMixin}
   */
  _layer.dimension = function(dimension) {
    if (!arguments.length) {
      return _dimension
    }
    _dimension = dimension
    return _layer
  }

  /**
   * **mandatory**
   *
   * Set or get the group attribute of a chart. In `dc` a group is a
   * {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter group}.
   * Usually the group should be created from the particular dimension associated with the same chart. If a value is
   * given, then it will be used as the new group.
   *
   * If no value specified then the current group will be returned.
   * If `name` is specified then it will be used to generate legend label.
   * @name group
   * @memberof dc.baseMixin
   * @instance
   * @see {@link https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce crossfilter.group}
   * @example
   * var index = crossfilter([]);
   * var dimension = index.dimension(dc.pluck('key'));
   * chart.dimension(dimension);
   * chart.group(dimension.group(crossfilter.reduceSum()));
   * @param {crossfilter.group} [group]
   * @param {String} [name]
   * @return {crossfilter.group}
   * @return {dc.baseMixin}
   */
  _layer.group = function(group, name) {
    if (!arguments.length) {
      return _group
    }
    _group = group
    _layer._groupName = name
    return _layer
  }

  _layer.opacity = function(opacity) {
    if (!arguments.length) {
      return _opacity
    }
    _opacity = opacity
    return _layer
  }

  function genHeatConfigFromChart(chart) {
    return {
      table: _layer.crossfilter().getTable()[0],
      width: Math.round(chart.width() * chart._getPixelRatio()),
      height: Math.round(chart.height() * chart._getPixelRatio()),
      min: chart.conv4326To900913(chart._minCoord),
      max: chart.conv4326To900913(chart._maxCoord),
      filter: _layer.crossfilter().getFilterString(),
      globalFilter: _layer.crossfilter().getGlobalFilterString(),
      neLat: chart._maxCoord[1],
      zoom: chart.zoom()
    }
  }

  _layer.genVega = function(chart, layerName) {
    const cap = _layer.cap()
    const group = _layer.group() || {}
    let query = ""
    if (group.type === "dimension") {
      query = group.writeTopQuery(cap, undefined, true)
    } else if (group.type === "group") {
      query = group.writeTopQuery(cap, undefined, false, true)
    }

    if (!query.length) {
      // throw new Error("Crossfilter group/dimension did not provide a sql query string for layer " + layerName + "." + (groupType.length ? " Group type: " + (group.type || "unknown") + "." : ""))
    }

    if (_layer.type === "heatmap") {
      const vega = _layer._genVega({
        ...genHeatConfigFromChart(chart),
        layerName
      })
      return vega
    } else {
      const vega = _layer._genVega(chart, layerName, group, query)
      return vega
    }
  }

  _layer.hasPopupColumns = function() {
    const popCols = _layer.popupColumns()
    return Boolean(popCols && popCols instanceof Array && popCols.length > 0)
  }

  function addPopupColumnToSet(colAttr, popupColSet) {
    // TODO(croot): getProjectOn for groups requires the two arguments,
    // dimension.getProjectOn() doesn't have any args.
    // Need to come up with a better API for group.getProjectOn()
    // and improve the api so that "as key0" are not automatically
    // added to those projection statements.

    // TODO(croot): performance could be improved here with a better
    // data structure, but probably not an issue given the amount
    // of popup col attrs to iterate through is small
    const dim = _layer.group() || _layer.dimension()
    if (dim || (_layer.layerType() === "points" || _layer.layerType() === "lines")) {
      const projExprs =
        _layer.layerType() === "points" || _layer.layerType() === "lines"
          ? _layer.getProjections()
          : dim.getProjectOn(true) // handles the group and dimension case
      const regex = /^\s*(\S+)\s+as\s+(\S+)/i
      const funcRegex = /^\s*(\S+\s*\(.*\))\s+as\s+(\S+)/i
      for (let i = 0; i < projExprs.length; ++i) {
        const projExpr = projExprs[i]
        let regexRtn = projExpr.match(regex)
        if (regexRtn) {
          if (regexRtn[2] === colAttr) {
            popupColSet.delete(colAttr)
            colAttr = projExpr
            break
          }
        } else if (
          (regexRtn = projExpr.match(funcRegex)) &&
          regexRtn[2] === colAttr
        ) {
          popupColSet.delete(colAttr)
          colAttr = projExpr
          break
        } else if (projExpr && projExpr.replace(/^\s+|\s+$/g, "") === colAttr) {
          break
        }
      }
    }
    return popupColSet.add(colAttr)
  }

  _layer.getPopupAndRenderColumns = function(chart) {
    const popupColsSet = new Set()
    const popupCols = _layer.popupColumns()
    if (popupCols) {
      popupCols.forEach(colAttr => {
        addPopupColumnToSet(colAttr, popupColsSet)
      })
    }
    _layer._addRenderAttrsToPopupColumnSet(chart, popupColsSet)

    const rtnArray = []
    popupColsSet.forEach(colName => {
      rtnArray.push(colName)
    })
    return rtnArray
  }

  function mapDataViaColumns(data, popupColumns, chart) {
    const newData = {}
    const columnSet = new Set(popupColumns)
    for (const key in data) {
      if (columnSet.has(key)) {
        newData[key] = data[key]
        if (typeof chart.useLonLat === "function" && chart.useLonLat()) {
          if (key === "x") {
            newData[key] = chart.conv900913To4326X(data[key])
          } else if (key === "y") {
            newData[key] = chart.conv900913To4326Y(data[key])
          }
        }
      }
    }
    return newData
  }

  _layer.areResultsValidForPopup = function(results) {
    if (!results) {
      return false
    }
    return _layer._areResultsValidForPopup(results[0])
  }

  function renderPopupHTML(data, columnOrder, columnMap, formatMeasureValue) {
    let html = ""
    columnOrder.forEach(key => {
      if (typeof data[key] === "undefined" || data[key] === null) {
        return
      }

      const columnKey = (columnMap && columnMap[key]) ? columnMap[key] : key
      const columnKeyTrimmed = columnKey.replace(/.*\((.*)\).*/, "$1")

      html =
        html +
        ('<div class="' +
          _popup_box_item_class +
          '"><span class="' +
          _popup_item_key_class +
          '">' +
          columnKey +
          ':</span><span class="' +
          _popup_item_val_class +
          '"> ' +
          formatMeasureValue(data[key], columnKeyTrimmed) +
          "</span></div>")
    })
    return html
  }

  _layer.displayPopup = function(
    chart,
    parentElem,
    result,
    minPopupArea,
    animate
  ) {
    const data = result.row_set[0]
    const popupColumns = _layer.popupColumns()
    const mappedColumns = _layer.popupColumnsMapped()
    const filteredData = mapDataViaColumns(data, popupColumns, chart)

    const width =
      typeof chart.effectiveWidth === "function"
        ? chart.effectiveWidth()
        : chart.width()
    const height =
      typeof chart.effectiveHeight === "function"
        ? chart.effectiveHeight()
        : chart.height()
    const margins =
      typeof chart.margins === "function"
        ? chart.margins()
        : { left: 0, right: 0, top: 0, bottom: 0 }

    const xscale = chart.x()
    const yscale = chart.y()

    const origXRange = xscale.range()
    const origYRange = yscale.range()

    xscale.range([0, width])
    yscale.range([0, height])

    const hoverSvgProps = {chart,
      parentElem,
      data,
      width,
      height,
      margins,
      xscale,
      yscale,
      minPopupArea,
      animate}

    const bounds = _layer._displayPopup(hoverSvgProps)

    // restore the original ranges so we don't screw anything else up
    xscale.range(origXRange)
    yscale.range(origYRange)

    const boundsCtr = AABox2d.getCenter(Point2d.create(), bounds)
    const overlapBounds = AABox2d.create(0, 0, width, height)
    AABox2d.intersection(overlapBounds, overlapBounds, bounds)

    if (AABox2d.isEmpty(overlapBounds)) {
      // there is no overlap with the two bounds, we should
      // never get here
      throw new Error(
        "Found a non-overlapping bounds for a pop-up shape and its parent div"
      )
    }

    const overlapSz = AABox2d.getSize(Point2d.create(), overlapBounds)
    const overlapCtr = AABox2d.getCenter(Point2d.create(), overlapBounds)

    const padding = 6 // in pixels TODO(croot): expose in css?
    let topOffset = 0

    const popupDiv = parentElem
      .append("div")
      .attr("class", _popup_wrap_class)
      .style({ left: boundsCtr[0] + "px", top: boundsCtr[1] + "px" })

    const popupBox = popupDiv
      .append("div")
      .attr("class", _popup_box_class)
      .html(
        _layer.popupFunction()
          ? _layer.popupFunction(filteredData, popupColumns, mappedColumns)
          : renderPopupHTML(filteredData, popupColumns, mappedColumns, chart.measureValue)
      )
      .style("left", function() {
        const rect = d3
          .select(this)
          .node()
          .getBoundingClientRect()
        const boxWidth = rect.width
        const halfBoxWidth = boxWidth / 2
        const boxHeight = rect.height
        const halfBoxHeight = boxHeight / 2

        // check top first
        let left = 0
        let hDiff = 0,
          wDiff = 0

        if (
          overlapSz[0] >= boxWidth ||
          (boundsCtr[0] + halfBoxWidth < width && boundsCtr[0] - halfBoxWidth >= 0)
        ) {
          left = boundsCtr[0] - overlapCtr[0]
          hDiff = overlapBounds[AABox2d.MINY] - boxHeight

          if (hDiff >= 0) {
            // can fit on top of shape and in the center of the shape horizontally
            topOffset = -(
              boundsCtr[1] -
              overlapBounds[AABox2d.MINY] +
              Math.min(padding, hDiff) +
              halfBoxHeight
            )
            return left + "px"
          }

          hDiff = overlapBounds[AABox2d.MAXY] + boxHeight
          if (hDiff < height) {
            // can fit on bottom and in the center of the shape horizontally
            topOffset =
              overlapBounds[AABox2d.MAXY] - boundsCtr[1] + Math.min(padding, hDiff) + halfBoxHeight
            return left + "px"
          }
        }

        if (
          overlapSz[1] >= boxHeight ||
          (boundsCtr[1] + halfBoxHeight < height && boundsCtr[1] - halfBoxHeight >= 0)
        ) {
          topOffset = overlapCtr[1] - boundsCtr[1]

          wDiff = overlapBounds[AABox2d.MINX] - boxWidth
          if (wDiff >= 0) {
            // can fit on the left in the center of the shape vertically
            left = -(
              boundsCtr[0] -
              overlapBounds[AABox2d.MINX] +
              Math.min(padding, wDiff) +
              halfBoxWidth
            )
            return left + "px"
          }

          wDiff = overlapBounds[AABox2d.MAXX] + boxWidth
          if (wDiff < width) {
            // can fit on right in the center of the shape vertically
            left =
              overlapBounds[AABox2d.MAXX] - boundsCtr[0] + Math.min(padding, wDiff) + halfBoxWidth
            return left + "px"
          }
        }

        if (
          width - overlapSz[0] >= boxWidth &&
          height - overlapSz[1] >= boxHeight
        ) {
          // we can fit the popup box in the remaining negative space.
          // Let's figure out where exactly
          if (
            Math.abs(boxHeight - overlapSz[1]) <
            Math.abs(boxWidth - overlapSz[0])
          ) {
            hDiff = height - overlapSz[1] - boxHeight
            if (overlapBounds[AABox2d.MINY] < height - overlapBounds[AABox2d.MAXY]) {
              topOffset = Math.min(padding, hDiff) + halfBoxHeight - boundsCtr[1]
            } else {
              topOffset =
                height - Math.min(padding, hDiff) - halfBoxHeight - boundsCtr[1]
            }

            wDiff = overlapBounds[AABox2d.MINX] - boxWidth
            if (wDiff >= 0) {
              // can fit on the left of the bounds
              left = -(
                boundsCtr[0] -
                overlapBounds[AABox2d.MINX] +
                Math.min(padding, wDiff) +
                halfBoxWidth
              )
            } else {
              wDiff = overlapBounds[AABox2d.MAXX] + boxWidth
              // can fit on right right of the bounds
              left =
                overlapBounds[AABox2d.MAXX] -
                boundsCtr[0] +
                Math.min(padding, wDiff) +
                halfBoxWidth
            }
            return left + "px"
          } else {
            wDiff = width - overlapSz[0] - boxWidth
            if (overlapBounds[AABox2d.MINX] < width - overlapBounds[AABox2d.MAXX]) {
              left = Math.min(padding, wDiff) + halfBoxWidth - boundsCtr[0]
            } else {
              left = width - Math.min(padding, wDiff) - halfBoxWidth - boundsCtr[0]
            }

            hDiff = overlapBounds[AABox2d.MINY] - boxHeight
            if (hDiff >= 0) {
              // can fit on top of shape and in the center of the shape horizontally
              topOffset = -(
                boundsCtr[1] -
                overlapBounds[AABox2d.MINY] +
                Math.min(padding, hDiff) +
                halfBoxHeight
              )
            } else {
              hDiff = overlapBounds[AABox2d.MAXY] + boxHeight
              // can fit on bottom and in the center of the shape horizontally
              topOffset =
                overlapBounds[AABox2d.MAXY] -
                boundsCtr[1] +
                Math.min(padding, hDiff) +
                halfBoxHeight
            }
            return left + "px"
          }
        }

        if (boxWidth * boxHeight < overlapSz[0] * overlapSz[1]) {
          // use the center of the overlapping bounds in the case where the box
          // can't fit anwhere on the outside
          topOffset = overlapCtr[1] - boundsCtr[1]
          left = overlapCtr[0] - boundsCtr[0]
        } else {
          // use the center of the screen
          topOffset = height / 2 - boundsCtr[1]
          left = width / 2 - boundsCtr[0]
        }
        return left + "px"
      })
      .style("top", () => topOffset + "px")

    _layerPopups[chart] = popupBox

    if (animate) {
      popupDiv.classed("showPopup", true)
    }
  }

  _layer.isPopupDisplayed = function(chart) {
    return _layerPopups[chart] !== undefined
  }

  _layer.hidePopup = function(chart, hideCallback) {
    if (_layerPopups[chart]) {
      const popup = chart.select("." + _popup_wrap_class)
      if (popup) {
        popup.classed("removePopup", true).on("animationend", () => {
          delete _layerPopups[chart]
          hideCallback(chart)
        })
      }

      _layer._hidePopup(chart)
    }
  }

  _layer.destroyLayer = function(chart) {
    // need to define a "_destroyLayer" method for each
    // layer mixin
    _layer._destroyLayer(chart)
  }

  _layer._addQueryDrivenRenderPropToSet = function(setObj, markPropObj, prop) {
    if (typeof markPropObj[prop] !== "object") {
      return
    }

    if (typeof markPropObj[prop].field !== "string") {
      return
    }

    const queryAttr = markPropObj[prop].field
    addPopupColumnToSet(queryAttr, setObj)
    return setObj
  }

  return _layer
}
