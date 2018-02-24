import {
  constants,
  decrementSampledCount,
  incrementSampledCount,
  transition
} from "../core/core"
import { lastFilteredSize } from "../core/core-async"
import baseMixin from "../mixins/base-mixin"
import bubbleMixin from "../mixins/bubble-mixin"
import capMixin from "../mixins/cap-mixin"
import d3 from "d3"
import { utils } from "../utils/utils"
/**
 * The bubble overlay chart is quite different from the typical bubble chart. With the bubble overlay
 * chart you can arbitrarily place bubbles on an existing svg or bitmap image, thus changing the
 * typical x and y positioning while retaining the capability to visualize data using bubble radius
 * and coloring.
 *
 * @name bubbleOverlay
 * @memberof dc
 * @mixes dc.bubbleMixin
 * @mixes dc.baseMixin
 * @example
 * // create a bubble overlay chart on top of the '#chart-container1 svg' element using the default global chart group
 * var bubbleChart1 = dc.bubbleOverlayChart('#chart-container1').svg(d3.select('#chart-container1 svg'));
 * // create a bubble overlay chart on top of the '#chart-container2 svg' element using chart group A
 * var bubbleChart2 = dc.compositeChart('#chart-container2', 'chartGroupA').svg(d3.select('#chart-container2 svg'));
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.bubbleOverlay}
 */
export default function bubbleOverlay(parent, chartGroup) {
  const BUBBLE_OVERLAY_CLASS = "bubble-overlay"

  /* OVERRIDE -----------------------------------------------------------------*/
  const BUBBLE_POPUP_CLASS = "bubble-popup"
  /* --------------------------------------------------------------------------*/

  const BUBBLE_NODE_CLASS = "node"
  const BUBBLE_CLASS = "bubble"

  /**
   * **mandatory**
   *
   * Set the underlying svg image element. Unlike other dc charts this chart will not generate a svg
   * element; therefore the bubble overlay chart will not work if this function is not invoked. If the
   * underlying image is a bitmap, then an empty svg will need to be created on top of the image.
   * @name svg
   * @memberof dc.bubbleOverlay
   * @instance
   * @example
   * // set up underlying svg element
   * chart.svg(d3.select('#chart svg'));
   * @param {SVGElement|d3.selection} [imageElement]
   * @return {dc.bubbleOverlay}
   */

  /* OVERRIDE -----------------------------------------------------------------*/
  const _chart = bubbleMixin(capMixin(baseMixin({})))
  /* --------------------------------------------------------------------------*/

  let _g
  const _points = []

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  let _colorCountUpdateCallback = null
  let _clickCallbackFunc = null
  let _sampling = false

  _chart.MIN_RADIUS = 2
  _chart.MAX_RADIUS = 10

  _chart.scaleRadius = false

  _chart.colorCountDictionary = {}

  _chart.clickCallback = function(_) {
    if (!arguments.length) {
      return _clickCallbackFunc
    }
    _clickCallbackFunc = _
    return _chart
  }

  _chart.transitionDuration(0)
  /* --------------------------------------------------------------------------*/

  _chart.radiusValueAccessor(d => d.value)

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  _chart.r(d3.scale.sqrt())

  _chart.bounds = null
  _chart.savedData = []
  _chart.onColorCountUpdate = function(f) {
    if (!arguments.length) {
      return _colorCountUpdateCallback
    }
    _colorCountUpdateCallback = f
    return _chart
  }

  _chart.sampling = function(setting) {
    // setting should be true or false
    if (!arguments.length) {
      return _sampling
    }

    if (setting && !_sampling) {
      // if wasn't sampling
      incrementSampledCount()
    } else if (!setting && _sampling) {
      decrementSampledCount()
    }
    _sampling = setting
    if (_sampling == false) {
      _chart.dimension().samplingRatio(null)
    } // unset sampling
    return _chart
  }

  _chart.setSample = function() {
    if (_sampling) {
      const id = _chart.dimension().getCrossfilterId()
      const filterSize = lastFilteredSize(id)
      if (filterSize === undefined) {
        _chart.dimension().samplingRatio(null)
      } else {
        _chart
          .dimension()
          .samplingRatio(Math.min(_chart.cap() / filterSize, 1.0))
      }
    }
  }

  _chart.onClick = function(d) {
    if (_chart.bounds == null) {
      return
    }
    const xPixelScale =
      1.0 / (_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width()
    const yPixelScale =
      1.0 / (_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height()
    const mapCoords = conv4326To900913([d.x, d.y])
    const pixelPos = {
      x: (mapCoords[0] - _chart.bounds[0][0]) * xPixelScale,
      y: _chart.height() - (mapCoords[1] - _chart.bounds[0][1]) * yPixelScale
    }

    if (_clickCallbackFunc != null) {
      _clickCallbackFunc(d)
    }
  }
  /* --------------------------------------------------------------------------*/

  /**
   * **mandatory**
   *
   * Set up a data point on the overlay. The name of a data point should match a specific 'key' among
   * data groups generated using keyAccessor.  If a match is found (point name <-> data group key)
   * then a bubble will be generated at the position specified by the function. x and y
   * value specified here are relative to the underlying svg.
   * @name point
   * @memberof dc.bubbleOverlay
   * @instance
   * @param {String} name
   * @param {Number} x
   * @param {Number} y
   * @return {dc.bubbleOverlay}
   */
  _chart.point = function(name, x, y) {
    _points.push({ name, x, y })
    return _chart
  }

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  function conv4326To900913(coord) {
    const transCoord = [0.0, 0.0]
    transCoord[0] = coord[0] * 111319.49077777777778
    transCoord[1] =
      Math.log(Math.tan((90.0 + coord[1]) * 0.00872664625997)) *
      6378136.99911215736947
    return transCoord
  }

  _chart.setBounds = function(bounds) {
    // need to convert to 900913 from 4326
    _chart.bounds = [[0.0, 0.0], [0.0, 0.0]]
    _chart.bounds[0] = conv4326To900913(bounds[0])
    _chart.bounds[1] = conv4326To900913(bounds[1])
  }
  /* --------------------------------------------------------------------------*/

  _chart._doRender = function() {
    _g = initOverlayG()

    /* OVERRIDE -----------------------------------------------------------------*/
    _g.selectAll("g").remove()
    _chart.plotData()
    /* --------------------------------------------------------------------------*/

    _chart.fadeDeselectedArea()

    return _chart
  }

  function initOverlayG() {
    _g = _chart.select("g." + BUBBLE_OVERLAY_CLASS)
    if (_g.empty()) {
      _g = _chart
        .svg()
        .append("g")
        .attr("class", BUBBLE_OVERLAY_CLASS)
    }
    return _g
  }

  /* OVERRIDE EXTEND ----------------------------------------------------------*/
  function mapDataToPoints(data) {
    if (_chart.bounds == null) {
      return
    }
    const xPixelScale =
      1.0 / (_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width()
    const yPixelScale =
      1.0 / (_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height()
    const numPoints = data.length
    for (let i = 0; i < numPoints; i++) {
      const coordTrans = conv4326To900913([data[i].x, data[i].y])
      const xPixel = (coordTrans[0] - _chart.bounds[0][0]) * xPixelScale
      const yPixel =
        _chart.height() - (coordTrans[1] - _chart.bounds[0][1]) * yPixelScale
      data[i].xPixel = xPixel
      data[i].yPixel = yPixel
      data[i].xCoord = coordTrans[0]
      data[i].yCoord = coordTrans[1]
    }
  }

  _chart.remapPoints = function() {
    if (_chart.bounds == null) {
      return
    }
    const xPixelScale =
      1.0 / (_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width()
    const yPixelScale =
      1.0 / (_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height()
    const numPoints = _chart.savedData.length
    for (let p = 0; p < numPoints; p++) {
      _chart.savedData[p].xPixel =
        (_chart.savedData[p].xCoord - _chart.bounds[0][0]) * xPixelScale
      _chart.savedData[p].yPixel =
        _chart.height() -
        (_chart.savedData[p].yCoord - _chart.bounds[0][1]) * yPixelScale
    }
    updateBubbles()
  }

  _chart.plotData = function() {
    getData()
    const startTime = new Date()
    mapDataToPoints(_chart.savedData)
    if (_chart.scaleRadius) {
      _chart.r().domain([_chart.rMin(), _chart.rMax()])

      _chart.r().range([_chart.MIN_RADIUS, _chart.MAX_RADIUS])
    }
    if (!_g) {
      initOverlayG()
    }
    const bubbleG = _g
      .selectAll("g." + BUBBLE_NODE_CLASS)
      .data(_chart.savedData, d => d.key)

    bubbleG
      .enter()
      .append("g")
      .attr("class", d => BUBBLE_NODE_CLASS + " " + utils.nameToId(d.key))
      .attr("transform", d => "translate(" + d.xPixel + "," + d.yPixel + ")")
      .append("circle")
      .attr("class", _chart.BUBBLE_CLASS)
      .attr(
        "r",
        d =>
          _chart.scaleRadius
            ? _chart.bubbleR(d)
            : _chart.radiusValueAccessor()(d)
      )
      .attr("fill", _chart.getColor)
      .on("click", _chart.onClick)

    bubbleG
      .attr("transform", d => "translate(" + d.xPixel + "," + d.yPixel + ")")
      .attr(
        "r",
        d =>
          _chart.scaleRadius
            ? _chart.bubbleR(d)
            : _chart.radiusValueAccessor()(d)
      )

    bubbleG.exit().remove()
    const stopTime = new Date()
    const diff = stopTime - startTime
  }

  function getData() {
    _chart.colorCountDictionary = {}
    _chart.savedData = _chart.data()
    _chart.savedData.forEach(datum => {
      if (datum.color in _chart.colorCountDictionary) {
        _chart.colorCountDictionary[datum.color]++
      } else {
        _chart.colorCountDictionary[datum.color] = 1
      }
      datum.key = _chart.keyAccessor()(datum)
    })
    if (_colorCountUpdateCallback != null) {
      _colorCountUpdateCallback(_chart.colorCountDictionary)
    }

    return _chart.savedData
  }
  /* --------------------------------------------------------------------------*/

  function initializeBubbles() {
    const data = mapData()

    _points.forEach(point => {
      const nodeG = getNodeG(point, data)

      let circle = nodeG.select("circle." + BUBBLE_CLASS)

      if (circle.empty()) {
        circle = nodeG
          .append("circle")
          .attr("class", BUBBLE_CLASS)
          .attr("r", 0)
          .attr("fill", _chart.getColor)
          .on("click", _chart.onClick)
      }

      transition(circle, _chart.transitionDuration()).attr("r", d =>
        _chart.bubbleR(d)
      )

      _chart._doRenderLabel(nodeG)

      _chart._doRenderTitles(nodeG)
    })
  }

  function mapData() {
    const data = {}
    _chart.data().forEach(datum => {
      data[_chart.keyAccessor()(datum)] = datum
    })
    return data
  }

  function getNodeG(point, data) {
    const bubbleNodeClass = BUBBLE_NODE_CLASS + " " + utils.nameToId(point.name)

    let nodeG = _g.select("g." + utils.nameToId(point.name))

    if (nodeG.empty()) {
      nodeG = _g
        .append("g")
        .attr("class", bubbleNodeClass)
        .attr("transform", "translate(" + point.x + "," + point.y + ")")
    }

    nodeG.datum(data[point.name])

    return nodeG
  }

  _chart._doRedraw = function() {
    /* OVERRIDE -----------------------------------------------------------------*/
    _chart.plotData()
    /* --------------------------------------------------------------------------*/

    _chart.fadeDeselectedArea()
    return _chart
  }

  function updateBubbles() {
    /* OVERRIDE -----------------------------------------------------------------*/
    if (!_g) {
      return
    }

    const bubbleG = _g
      .selectAll("g." + BUBBLE_NODE_CLASS)
      .data(_chart.savedData, d => d.key0)

    bubbleG.attr(
      "transform",
      d => "translate(" + d.xPixel + "," + d.yPixel + ")"
    )
    /* --------------------------------------------------------------------------*/
  }

  _chart.debug = function(flag) {
    if (flag) {
      let debugG = _chart.select("g." + constants.DEBUG_GROUP_CLASS)

      if (debugG.empty()) {
        debugG = _chart
          .svg()
          .append("g")
          .attr("class", constants.DEBUG_GROUP_CLASS)
      }

      const debugText = debugG
        .append("text")
        .attr("x", 10)
        .attr("y", 20)

      debugG
        .append("rect")
        .attr("width", _chart.width())
        .attr("height", _chart.height())
        .on("mousemove", () => {
          const position = d3.mouse(debugG.node())
          const msg = position[0] + ", " + position[1]
          debugText.text(msg)
        })
    } else {
      _chart.selectAll(".debug").remove()
    }

    return _chart
  }

  _chart.anchor(parent, chartGroup)

  return _chart
}
/** ***************************************************************************
 * END OVERRIDE: dc.bubbleOverlay                                             *
 * ***************************************************************************/
