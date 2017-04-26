import {override, transition, units} from "../core/core"
import baseMixin from "./base-mixin"
import bindEventHandlers from "./ui/coordinate-grid-raster-mixin-ui"
import colorMixin from "./color-mixin"
import d3 from "d3"
import marginMixin from "./margin-mixin"

/**
 * Coordinate Grid Raster is an abstract base chart designed to support coordinate grid based
 * chart types when the data is backend rendered.
 * @name coordinateGridRasterMixin
 * @memberof dc
 * @mixin
 * @mixes dc.colorMixin
 * @mixes dc.marginMixin
 * @mixes dc.baseMixin
 * @param {Object} _chart
 * @return {dc.coordinateGridRasterMixin}
 */
export default function coordinateGridRasterMixin (_chart, _mapboxgl, browser) {
  var _mapboxgl = typeof mapboxgl === "undefined" ? _mapboxgl : mapboxgl

  const GRID_LINE_CLASS = "grid-line"
  const HORIZONTAL_CLASS = "horizontal"
  const VERTICAL_CLASS = "vertical"
  const Y_AXIS_LABEL_CLASS = "y-axis-label"
  const X_AXIS_LABEL_CLASS = "x-axis-label"
  const DEFAULT_AXIS_LABEL_PADDING = 12

  let _brush = d3.svg.brush()
  let _hasBeenRendered = false
  const _scale = [1, 1]
  const _offset = [0, 0]
  const _currDataBounds = [[0, 1], [0, 1]]
  let _queryId = null
  let _filters = []
  let _initialFilters = null
  let _gridInitted = false

  _chart = colorMixin(marginMixin(baseMixin(_chart)))
  _chart._mandatoryAttributes().push("x", "y")

  _chart.filters = function () {
    return _filters
  }

  _chart.filter = function (filters) {
    if (typeof filters === "undefined" || filters === null) {
      _initialFilters = _initialFilters || [[]]
      filterChartDimensions(_initialFilters[0][0], _initialFilters[0][1], true)
    } else if (Array.isArray(filters) && filters.length === 2) {
      filterChartDimensions(filters[0], filters[1], false)
    } else {
      throw new Error("Invalid filter applied. Filter must be an array with two elements")
    }

    return _chart
  }

  function filterChartDimensions (xrange, yrange, shouldReset) {
    if (!_initialFilters) {
      _initialFilters = [[xrange, yrange]]
    }

    let xdim = _chart.xDim()
    let ydim = _chart.yDim()

    if (xdim) {
      xdim.filter(xrange)
    }

    if (ydim) {
      ydim.filter(yrange)
    }

    if (typeof _chart.getLayers === "function") {
      _chart.getLayers().forEach((layer) => {
        if (typeof layer.xDim === "function" && typeof layer.yDim === "function") {
          xdim = layer.xDim()
          ydim = layer.yDim()
          if (xdim !== null && ydim !== null) {
            xdim.filter(xrange)
            ydim.filter(yrange)
          }
        }
      })
    }

    _filters = shouldReset ? [] : [[xrange, yrange]]
    _chart._invokeFilteredListener(_filters, false)
    _chart.xRangeFilter(xrange)
    _chart.yRangeFilter(yrange)
  }

  let _parent
  let _g
  let _chartBody
  let _gl
  let _shaderProgram, _fragShader, _vertShader
  let _vbo
  let _tex
  let _img

  let _eventHandler
  let _interactionsEnabled = false

  let _xOriginalDomain
  let _xAxis = d3.svg.axis().orient("bottom")
  let _xUnits = units.integers
  let _xAxisPadding = 0
  let _xElasticity = false
  let _xAxisLabel
  let _xAxisLabelPadding = 0
  let _lastXDomain

  let _yAxis = d3.svg.axis().orient("left")
  let _yAxisPadding = 0
  let _yElasticity = false
  let _yAxisLabel
  let _yAxisLabelPadding = 0

  let _renderHorizontalGridLine = false
  let _renderVerticalGridLine = false

  let _resizing = false

  let _unitCount

  let _outerRangeBandPadding = 0.5
  let _rangeBandPadding = 0

  let _useRightYAxis = false

  let _maxBounds = [[-Infinity, -Infinity], [Infinity, Infinity]]

  _chart._fitToMaxBounds = function (currBounds, resizeToScale) {
    const xmin = currBounds[0][0]
    const ymin = currBounds[0][1]
    const xmax = currBounds[1][0]
    const ymax = currBounds[1][1]
    const xdiff = xmax - xmin
    const ydiff = ymax - ymin

    const bounds_xmin = _maxBounds[0][0]
    const bounds_ymin = _maxBounds[0][1]
    const bounds_xmax = _maxBounds[1][0]
    const bounds_ymax = _maxBounds[1][1]

    const newbounds = [[Math.max(xmin, bounds_xmin), Math.max(ymin, bounds_ymin)],
                         [Math.min(xmax, bounds_xmax), Math.min(ymax, bounds_ymax)]]

    if (resizeToScale) {
      const newxdiff = newbounds[1][0] - newbounds[0][0]
      const newydiff = newbounds[1][1] - newbounds[0][1]

      const deltax = xdiff - newxdiff
      const deltay = ydiff - newydiff

      // NOTE: deltax & deltay should be >= 0
      if (deltax !== 0) {
        if (newbounds[0][0] !== bounds_xmin) {
          newbounds[0][0] = Math.max(newbounds[0][0] - deltax, bounds_xmin)
        } else if (newbounds[1][0] !== bounds_xmax) {
          newbounds[1][0] = Math.min(newbounds[1][0] + deltax, bounds_xmax)
        }
      }

      if (deltay !== 0) {
        if (newbounds[0][1] !== bounds_ymin) {
          newbounds[0][1] = Math.max(newbounds[0][1] - deltay, bounds_ymin)
        } else if (newbounds[1][1] !== bounds_ymax) {
          newbounds[1][1] = Math.min(newbounds[1][1] + deltay, bounds_ymax)
        }
      }
    }

    return newbounds
  }

  _chart.maxBounds = function (maxBounds) {
    if (!arguments.length) {
      return _maxBounds
    }

    // TODO(croot): verify max bounds?
    if (!(maxBounds instanceof Array) || maxBounds.length !== 2 || !(maxBounds[0] instanceof Array) || maxBounds[0].length !== 2 || !(maxBounds[1] instanceof Array) || maxBounds[1].length !== 2) {
      throw new Error("Invalid bounds argument. A bounds object should be: [[xmin, ymin], [xmax, ymax]]")
    }

    _maxBounds = [[Math.min(maxBounds[0][0], maxBounds[1][0]), Math.min(maxBounds[0][1], maxBounds[1][1])],
                      [Math.max(maxBounds[0][0], maxBounds[1][0]), Math.max(maxBounds[0][1], maxBounds[1][1])]]

    return _chart
  }

  _chart.unproject = function (pt) {
    let xscale = _chart.x(),
      yscale = _chart.y()
    const x = (xscale ? xscale.invert(pt.x) : 0)
    const y = (yscale ? yscale.invert(pt.y) : 0)
    return new _mapboxgl.Point(x, y)
  }

  _chart.enableInteractions = function (enableInteractions, opts = {}) {
    if (!arguments.length) {
      return _interactionsEnabled
    }

    _interactionsEnabled = Boolean(enableInteractions)
    if (_eventHandler) {
      const map = _chart.map()
      _eventHandler.getInteractionPropNames().forEach(prop => {
        if (map[prop]) {
          const enable = (typeof opts[prop] === "undefined" ? _interactionsEnabled : Boolean(opts[prop]))
          if (enable) {
            map[prop].enable()
          } else {
            map[prop].disable()

            if (prop === "dragPan") {
              // force a clear of the current event state on the map
              // to fully disable pans
              map[prop].onMouseUp({
                button: 0
              })
            }
          }
        }
      })
    }

    return _chart
  }

  /**
   * When changing the domain of the x or y scale, it is necessary to tell the chart to recalculate
   * and redraw the axes. (`.rescale()` is called automatically when the x or y scale is replaced
   * with {@link #dc.coordinateGridRasterMixin+x .x()} or {@link #dc.coordinateGridRasterMixin+y .y()}, and has
   * no effect on elastic scales.)
   * @name rescale
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.rescale = function () {
    _unitCount = undefined
    _resizing = true
    return _chart
  }

  _chart.resizing = function () {
    return _resizing
  }

  function initWebGL (canvas) {
    const webglAttrs = {
      alpha: true,
      antialias: true,
      // premultipliedAlpha: false,
      depth: false,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false
    }
    _gl = canvas.getContext("webgl", webglAttrs) || canvas.getContext("experimental-webgl", webglAttrs)

    const vertShaderSrc = "" + "precision mediump float;\n" + "attribute vec2 a_pos;\n" + "attribute vec2 a_texCoords;\n" + "\n" + "varying vec2 v_texCoords;\n" + "uniform vec2 u_texCoordsScale;\n" + "uniform vec2 u_texCoordsOffset;\n" + "\n" + "void main(void) {\n" + "    gl_Position = vec4(a_pos, 0, 1);\n" + "\n" + "    v_texCoords = u_texCoordsScale * a_texCoords + u_texCoordsOffset;\n" +
      // NOTE: right now it seems that unpacking the base64 array via the
      // createImageBitmap() call puts pixel 0,0 in the upper left-hand
      // corner rather than the lower left-hand corner in the way that
      // webgl expects, so flipping the y texture coords below.
      // If another way of extracing the base64 image data is done
      // that doesn"t flip the image, then flip the y tex coords
      "    v_texCoords.y = (1.0 - v_texCoords.y);\n" + "}"

    const fragShaderSrc = "" + "precision mediump float;\n" + "\n" + "uniform sampler2D u_sampler;\n" + "\n" + "varying vec2 v_texCoords;\n" + "\n" + "void main() {\n" + "    if (v_texCoords[0] >= 0.0 && v_texCoords[0] <= 1.0 &&\n" + "        v_texCoords[1] >= 0.0 && v_texCoords[1] <= 1.0) {\n" + "        gl_FragColor = texture2D(u_sampler, v_texCoords);\n" + "    }\n" + "}"

    const gl = _gl

    const program = _shaderProgram = gl.createProgram()

    const fragShader = _fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fragShaderSrc)
    gl.compileShader(fragShader)
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(fragShader))
    }
    gl.attachShader(program, fragShader)

    const vertShader = _vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vertShaderSrc)
    gl.compileShader(vertShader)
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vertShader))
    }
    gl.attachShader(program, vertShader)

    gl.linkProgram(program)
    gl.validateProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Error linking shader program: " + gl.getProgramInfoLog(program))
    }

    program.a_pos = gl.getAttribLocation(program, "a_pos")
    program.a_texCoords = gl.getAttribLocation(program, "a_texCoords")
    gl.enableVertexAttribArray(program.a_pos)
    gl.enableVertexAttribArray(program.a_texCoords)

    program.u_texCoordsScale = gl.getUniformLocation(program, "u_texCoordsScale")
    program.u_texCoordsOffset = gl.getUniformLocation(program, "u_texCoordsOffset")
    program.u_sampler = gl.getUniformLocation(program, "u_sampler")

    gl.useProgram(program)

    const vbo = _vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)

    const vertData = [-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1] // unflipped

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertData), gl.STATIC_DRAW)
    gl.vertexAttribPointer(_shaderProgram.a_pos, 2, gl.FLOAT, false, 16, 0)
    gl.vertexAttribPointer(_shaderProgram.a_texCoords, 2, gl.FLOAT, false, 16, 8)

    createGLTexture()
  }

  function destroy () {
    destroyWebGL()

    if (_eventHandler) {
      _eventHandler.destroy()
    }
    _eventHandler = null

    if (_chartBody && _chartBody.parentNode) {
      _chartBody.parentNode.removeChild(node)
    }

    _chartBody = null
  }

  function destroyWebGL () {
    const gl = _gl
    if (typeof _shaderProgram !== "object") { return }
    gl.deleteProgram(_shaderProgram)
    if (_fragShader) { gl.deleteShader(_fragShader) }
    if (_vertShader) { gl.deleteShader(_vertShader) }
    if (_vbo) { gl.deleteBuffer(_vbo) }

    _shaderProgram = _fragShader = _vertShader = _vbo = 0

    removeGLTexture()
  }

  function createGLTexture () {
    if (!_tex) {
      const gl = _gl

      // use cyan as the default color.
      const initialColor = new Uint8Array([0, 0, 0, 0])

      // make a texture with 1x1 pixels so we can use the texture immediately
      // while we wait for the image to load
      const tex = _tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, initialColor)
    }
  }

  function removeGLTexture () {
    if (_tex) {
      _gl.deleteTexture(_tex)
      _tex = 0
    }

    // destroy our image cache
    _img = null
  }

  _chart._removeOverlay = function () {
    removeGLTexture()
  }


  _chart._generateG = function (parent) {
    if (parent === undefined) {
      parent = _chart.svg()
    }

    const reset = (parent !== _parent)
    _parent = parent

    if (!_g || reset) {
      _g = _parent.append("g")
    }

    if (!_chartBody) {
      var root = _chart.root()

      _chartBody = root.append("canvas")
        .attr("class", "webgl-canvas")
        .style("position", "absolute")

      const containerNode = root.node()
      const chartNode = _chartBody.node()

      initWebGL(chartNode)
      _eventHandler = bindEventHandlers(
                        _chart,
                        containerNode,
                        _currDataBounds,
                        _scale,
                        _offset,
                        filterChartDimensions,
                        doChartRedraw,
                        browser,
                        _mapboxgl,
                        _interactionsEnabled)
    } else if (reset) {
      var root = _chart.root().node()
      const node = _chartBody.node()
      root.appendChild(node)
    }

    return _g
  }

  /**
   * Get or set the root g element. This method is usually used to retrieve the g element in order to
   * overlay custom svg drawing programatically. **Caution**: The root g element is usually generated
   * by dc.js internals, and resetting it might produce unpredictable result.
   * @name g
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {SVGElement} [gElement]
   * @return {SVGElement}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.g = function (gElement) {
    if (!arguments.length) {
      return _g
    }
    _g = gElement
    return _chart
  }

  /**
   * Retrieve the canvas for the chart body.
   * @param {SVGElement} [chartBody]
   * @return {SVGElement}
   */
  _chart.chartBody = function (chartBody) {
    return _chartBody
  }

  _chart.xOriginalDomain = function () {
    return _xOriginalDomain
  }

  /**
   * Set or get the xUnits function. The coordinate grid chart uses the xUnits function to calculate
   * the number of data projections on x axis such as the number of bars for a bar chart or the
   * number of dots for a line chart. This function is expected to return a Javascript array of all
   * data points on x axis, or the number of points on the axis. [d3 time range functions
   * d3.time.days, d3.time.months, and
   * d3.time.years](https://github.com/mbostock/d3/wiki/Time-Intervals#aliases) are all valid xUnits
   * function. dc.js also provides a few units function, see the {@link #utilities Utilities} section for
   * a list of built-in units functions. The default xUnits function is units.integers.
   * @name xUnits
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @todo Add docs for utilities
   * @example
   * // set x units to count days
   * chart.xUnits(d3.time.days)
   * // set x units to count months
   * chart.xUnits(d3.time.months)
   *
   * // A custom xUnits function can be used as long as it follows the following interface:
   * // units in integer
   * function(start, end, xDomain) {
   *      // simply calculates how many integers in the domain
   *      return Math.abs(end - start)
   * }
   *
   * // fixed units
   * function(start, end, xDomain) {
   *      // be aware using fixed units will disable the focus/zoom ability on the chart
   *      return 1000
   * }
   * @param {Function} [xUnits]
   * @return {Function}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.xUnits = function (xUnits) {
    if (!arguments.length) {
      return _xUnits
    }
    _xUnits = xUnits
    return _chart
  }

  /**
   * Set or get the x axis used by a particular coordinate grid chart instance. This function is most
   * useful when x axis customization is required. The x axis in dc.js is an instance of a [d3
   * axis object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis); therefore it supports any
   * valid d3 axis manipulation. **Caution**: The x axis is usually generated internally by dc
   * resetting it may cause unexpected results.
   * @name xAxis
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
   * @example
   * // customize x axis tick format
   * chart.xAxis().tickFormat(function(v) {return v + "%";})
   * // customize x axis tick values
   * chart.xAxis().tickValues([0, 100, 200, 300])
   * @param {d3.svg.axis} [xAxis=d3.svg.axis().orient("bottom")]
   * @return {d3.svg.axis}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.xAxis = function (xAxis) {
    if (!arguments.length) {
      return _xAxis
    }
    _xAxis = xAxis
    return _chart
  }

  /**
   * Turn on/off elastic x axis behavior. If x axis elasticity is turned on, then the grid chart will
   * attempt to recalculate the x axis range whenever a redraw event is triggered.
   * @name elasticX
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Boolean} [elasticX=false]
   * @return {Boolean}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.elasticX = function (elasticX) {
    if (!arguments.length) {
      return _xElasticity
    }
    _xElasticity = elasticX
    return _chart
  }

  /**
   * Set or get x axis padding for the elastic x axis. The padding will be added to both end of the x
   * axis if elasticX is turned on; otherwise it is ignored.
   *
   * padding can be an integer or percentage in string (e.g. "10%"). Padding can be applied to
   * number or date x axes.  When padding a date axis, an integer represents number of days being padded
   * and a percentage string will be treated the same as an integer.
   * @name xAxisPadding
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Number|String} [padding=0]
   * @return {Number|String}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.xAxisPadding = function (padding) {
    if (!arguments.length) {
      return _xAxisPadding
    }
    _xAxisPadding = padding
    return _chart
  }

  /**
   * Returns the number of units displayed on the x axis using the unit measure configured by
   * .xUnits.
   * @name xUnitCount
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @return {Number}
   */
  _chart.xUnitCount = function () {
    if (_unitCount === undefined) {
      const units = _chart.xUnits()(_chart.x().domain()[0], _chart.x().domain()[1], _chart.x().domain())

      if (units instanceof Array) {
        _unitCount = units.length
      } else {
        _unitCount = units
      }
    }

    return _unitCount
  }

  /**
   * Gets or sets whether the chart should be drawn with a right axis instead of a left axis. When
   * used with a chart in a composite chart, allows both left and right Y axes to be shown on a
   * chart.
   * @name useRightYAxis
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Boolean} [useRightYAxis=false]
   * @return {Boolean}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.useRightYAxis = function (useRightYAxis) {
    if (!arguments.length) {
      return _useRightYAxis
    }
    _useRightYAxis = useRightYAxis
    return _chart
  }

  /**
   * Returns true if the chart is using ordinal xUnits ({@link #units.ordinal units.ordinal}, or false
   * otherwise. Most charts behave differently with ordinal data and use the result of this method to
   * trigger the appropriate logic.
   * @name isOrdinal
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @return {Boolean}
   */
  _chart.isOrdinal = function () {
    return _chart.xUnits() === units.ordinal
  }

  _chart._useOuterPadding = function () {
    return true
  }

  function compareDomains (d1, d2) {
    return !d1 || !d2 || d1.length !== d2.length || d1.some((elem, i) => (elem && d2[i]) ? elem.toString() !== d2[i].toString() : elem === d2[i])
  }

  function prepareChartBody () {
    const width = _chart.effectiveWidth()
    const height = _chart.effectiveHeight()
    const margins = _chart.margins()
    const left = margins.left
    const top = margins.top
    const pixelRatio = window.devicePixelRatio || 1

    const prevWidth = _chartBody.style("width")
    const prevHeight = _chartBody.style("height")

    // set the actual canvas size, taking pixel ratio into account
    _chartBody.style("width", width + "px")
      .style("height", height + "px")
      .style("left", left + "px")
      .style("top", top + "px")
      .attr("width", width * pixelRatio)
      .attr("height", height * pixelRatio)

    _parent
      .attr("width", width * pixelRatio)
      .attr("height", height * pixelRatio)

    if (prevWidth !== _chartBody.style("width") || prevHeight !== _chartBody.style("height")) {
      // TODO(croot): What about when the margins change?
      // That's not truly a resize event
      _chart.map().fire("resize", {
        width,
        height,
        top,
        left
      })
    }
  }

  function renderChart (imgUrl, renderBounds, queryId) {
    const gl = _gl

    if (imgUrl) { // should we check to see if the imgUrl is the same from the previous render?
      _mapboxgl.util.getImage(imgUrl, (err, img) => {
        if (queryId === _queryId) {
          const xdom = _chart.x().domain()
          const ydom = _chart.y().domain()

          if (xdom[0] === renderBounds[0][0] && xdom[1] === renderBounds[1][0] && ydom[0] === renderBounds[2][1] && ydom[1] === renderBounds[0][1]) {

            if (!_tex) {
              createGLTexture()
            }

            if (!_img || img.width != _img.width || img.height != _img.height) {
              // Image was updated and dimensions changed.
              gl.bindTexture(gl.TEXTURE_2D, _tex)
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

              if (!_img) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
              }
            } else {
              // Image was updated but dimensions unchanged.
              gl.bindTexture(gl.TEXTURE_2D, _tex)
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img)
            }
            _img = img

            _scale[0] = 1
            _scale[1] = 1
            _offset[0] = 0
            _offset[1] = 0
            const xrange = _chart.xRange()
            const yrange = _chart.yRange()
            _currDataBounds[0][0] = xrange[0]
            _currDataBounds[0][1] = xrange[1]
            _currDataBounds[1][0] = yrange[0]
            _currDataBounds[1][1] = yrange[1]

            renderChart()
          }
        }
      })
    }

    if (queryId !== null && queryId !== undefined) { _queryId = queryId }

    const pixelRatio = window.devicePixelRatio || 1
    gl.viewport(0, 0, _chart.effectiveWidth() * pixelRatio, _chart.effectiveHeight() * pixelRatio)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.enable(gl.BLEND)

    gl.useProgram(_shaderProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, _vbo)

    gl.uniform2fv(_shaderProgram.u_texCoordsScale, _scale)
    gl.uniform2fv(_shaderProgram.u_texCoordsOffset, _offset)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, _tex)
    gl.uniform1i(_shaderProgram.u_sampler, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  function prepareXAxis (g, x, render, transitionDuration) {
    // has the domain changed?
    const xdom = x.domain()
    if (render || compareDomains(_lastXDomain, xdom)) {
      _chart.rescale()
    }
    _lastXDomain = xdom

    // TODO(croot): support ordinal scales?
    // If BE supports ordinal scales for X axis, use
    // rangeBands here: i.e. x.rangeBands([0, _chart.xAxisLength()], ...)

    // currently only supports quantitative scal
    x.range([0, Math.round(_chart.xAxisLength())])

    const customTimeFormat = d3.time.format.utc.multi([
      [".%L", function (d) {
        return d.getUTCMilliseconds()
      }],
      [":%S", function (d) {
        return d.getUTCSeconds()
      }],
      ["%I:%M", function (d) {
        return d.getUTCMinutes()
      }],
      ["%I %p", function (d) {
        return d.getUTCHours()
      }],
      ["%a %d", function (d) {
        return d.getUTCDay() && d.getUTCDate() != 1
      }],
      ["%b %d", function (d) {
        return d.getUTCDate() != 1
      }],
      ["%b", function (d) {
        return d.getUTCMonth()
      }],
      ["%Y", function () {
        return true
      }]
    ])

    _xAxis = _xAxis.scale(x).tickFormat(xdom[0] instanceof Date ? customTimeFormat : _xAxis.tickFormat())

    _xAxis.ticks(_chart.effectiveWidth() / _xAxis.scale().ticks().length < 64 ? Math.ceil(_chart.effectiveWidth() / 64) : 10)

    _chart.prepareLabelEdit("x")

    renderVerticalGridLines(g, x, transitionDuration)
  }

  _chart.renderXAxis = function (g, transitionDuration) {
    let axisXG = g.selectAll("g.x")

    if (axisXG.empty()) {
      axisXG = g.append("g")
        .attr("class", "axis x")
        .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
    }

    const root = _chart.root()
    let xLabel = root.selectAll(".x-axis-label")

    if (xLabel.empty()) {
      xLabel = root.append("div")
        .attr("class", "x-axis-label")
    }

    xLabel
      .style("left", (_chart.effectiveWidth() / 2 + _chart.margins().left) + "px")
      .text(_chart.xAxisLabel())


    if (transitionDuration === undefined) {
      transitionDuration = _chart.transitionDuration()
    }
    transition(axisXG, transitionDuration)
      .attr("transform", "translate(" + _chart.margins().left + "," + _chart._xAxisY() + ")")
      .call(_xAxis)
  }

  function renderVerticalGridLines (g, x, transitionDuration) {
    let gridLineG = g.selectAll("g." + VERTICAL_CLASS)

    if (_renderVerticalGridLine) {
      if (gridLineG.empty()) {
        gridLineG = g.insert("g", ":first-child")
          .attr("class", GRID_LINE_CLASS + " " + VERTICAL_CLASS)
          .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")
      }

      const ticks = _xAxis.tickValues() ? _xAxis.tickValues() : (typeof x.ticks === "function" ? x.ticks(_xAxis.ticks()[0]) : x.domain())

      const lines = gridLineG.selectAll("line")
        .data(ticks)

      // enter
      const linesGEnter = lines.enter()
        .append("line")
        .attr("x1", (d) => x(d))
        .attr("y1", _chart._xAxisY() - _chart.margins().top)
        .attr("x2", (d) => x(d))
        .attr("y2", 0)
        .attr("opacity", 0)

      if (transitionDuration === undefined) {
        transitionDuration = _chart.transitionDuration()
      }

      transition(linesGEnter, transitionDuration)
        .attr("opacity", 1)

      // update
      transition(lines, transitionDuration)
        .attr("x1", (d) => x(d))
        .attr("y1", _chart._xAxisY() - _chart.margins().top)
        .attr("x2", (d) => x(d))
        .attr("y2", 0)

      // exit
      lines.exit().remove()
    } else {
      gridLineG.selectAll("line").remove()
    }
  }

  _chart._xAxisY = function () {
    return (_chart.height() - _chart.margins().bottom)
  }

  _chart.xAxisLength = function () {
    return _chart.effectiveWidth()
  }

  /**
   * Set or get the x axis label. If setting the label, you may optionally include additional padding to
   * the margin to make room for the label. By default the padded is set to 12 to accomodate the text height.
   * @name xAxisLabel
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {String} [labelText]
   * @param {Number} [padding=12]
   * @return {String}
   */
  _chart.xAxisLabel = function (labelText, padding) {
    if (!arguments.length) {
      return _xAxisLabel
    }
    _xAxisLabel = labelText
    _chart.margins().bottom -= _xAxisLabelPadding
    _xAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding
    _chart.margins().bottom += _xAxisLabelPadding
    return _chart
  }

  _chart._prepareYAxis = function (g, y, transitionDuration) {
    y.range([Math.round(_chart.yAxisHeight()), 0])

    _yAxis = _yAxis.scale(y)

    _yAxis.ticks(_chart.effectiveHeight() / _yAxis.scale().ticks().length < 16 ? Math.ceil(_chart.effectiveHeight() / 16) : 10)

    if (_useRightYAxis) {
      _yAxis.orient("right")
    }

    _chart._renderHorizontalGridLinesForAxis(g, y, _yAxis, transitionDuration)
    _chart.prepareLabelEdit("y")
  }

  _chart.renderYAxisLabel = function (axisClass, text, rotation, labelXPosition) {
    const root = _chart.root()

    let yLabel = root.selectAll(".y-axis-label")

    if (yLabel.empty()) {
      yLabel = root.append("div")
        .attr("class", "y-axis-label")
    }

    if (text !== "") {
      // TODO(croot): should add the rotation and labelXPosition here
      // As of now (09/02/2016) the chart.css is breaking this.

      yLabel
        .style("top", (_chart.effectiveHeight() / 2 + _chart.margins().top) + "px")
        .text(text)
    }
  }

  _chart.renderYAxisAt = function (axisClass, axis, position, transitionDuration) {
    let axisYG = _chart.g().selectAll("g." + axisClass)
    if (axisYG.empty()) {
      axisYG = _chart.g().append("g")
        .attr("class", "axis " + axisClass)
        .attr("transform", "translate(" + position + "," + _chart.margins().top + ")")
    }

    if (transitionDuration === undefined) {
      transitionDuration = _chart.transitionDuration()
    }

    transition(axisYG, transitionDuration)
      .attr("transform", "translate(" + position + "," + _chart.margins().top + ")")
      .call(axis)
  }

  _chart.renderYAxis = function (g, transitionDuration) {
    const axisPosition = _useRightYAxis ? (_chart.width() - _chart.margins().right) : _chart._yAxisX()
    _chart.renderYAxisAt("y", _yAxis, axisPosition, transitionDuration)
    const labelPosition = _useRightYAxis ? (_chart.width() - _yAxisLabelPadding) : _yAxisLabelPadding
    const rotation = _useRightYAxis ? 90 : -90
    _chart.renderYAxisLabel("y", _chart.yAxisLabel(), rotation, labelPosition)
  }

  _chart._renderHorizontalGridLinesForAxis = function (g, scale, axis, transitionDuration) {
    let gridLineG = g.selectAll("g." + HORIZONTAL_CLASS)

    if (_renderHorizontalGridLine) {
      const ticks = axis.tickValues() ? axis.tickValues() : scale.ticks(axis.ticks()[0])

      if (gridLineG.empty()) {
        gridLineG = g.insert("g", ":first-child")
          .attr("class", GRID_LINE_CLASS + " " + HORIZONTAL_CLASS)
          .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")")
      }

      const lines = gridLineG.selectAll("line")
        .data(ticks)

      // enter
      const linesGEnter = lines.enter()
        .append("line")
        .attr("x1", 1)
        .attr("y1", (d) => scale(d))
        .attr("x2", _chart.xAxisLength())
        .attr("y2", (d) => scale(d))
        .attr("opacity", 0)

      if (transitionDuration === undefined) {
        transitionDuration = _chart.transitionDuration()
      }

      transition(linesGEnter, transitionDuration)
        .attr("opacity", 1)

      // update
      transition(lines, transitionDuration)
        .attr("x1", 1)
        .attr("y1", (d) => scale(d))
        .attr("x2", _chart.xAxisLength())
        .attr("y2", (d) => scale(d))

      // exit
      lines.exit().remove()
    } else {
      gridLineG.selectAll("line").remove()
    }
  }

  _chart._yAxisX = function () {
    return _chart.useRightYAxis() ? _chart.width() - _chart.margins().right : _chart.margins().left
  }

  /**
   * Set or get the y axis label. If setting the label, you may optionally include additional padding
   * to the margin to make room for the label. By default the padded is set to 12 to accomodate the
   * text height.
   * @name yAxisLabel
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {String} [labelText]
   * @param {Number} [padding=12]
   * @return {String}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.yAxisLabel = function (labelText, padding) {
    if (!arguments.length) {
      return _yAxisLabel
    }
    _yAxisLabel = labelText
    _chart.margins().left -= _yAxisLabelPadding
    _yAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding
    _chart.margins().left += _yAxisLabelPadding
    return _chart
  }

  /**
   * Set or get the y axis used by the coordinate grid chart instance. This function is most useful
   * when y axis customization is required. The y axis in dc.js is simply an instance of a [d3 axis
   * object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-_axis); therefore it supports any
   * valid d3 axis manipulation. **Caution**: The y axis is usually generated internally by dc
   * resetting it may cause unexpected results.
   * @name yAxis
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
   * @example
   * // customize y axis tick format
   * chart.yAxis().tickFormat(function(v) {return v + "%";})
   * // customize y axis tick values
   * chart.yAxis().tickValues([0, 100, 200, 300])
   * @param {d3.svg.axis} [yAxis=d3.svg.axis().orient("left")]
   * @return {d3.svg.axis}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.yAxis = function (yAxis) {
    if (!arguments.length) {
      return _yAxis
    }
    _yAxis = yAxis
    return _chart
  }

  /**
   * Turn on/off elastic y axis behavior. If y axis elasticity is turned on, then the grid chart will
   * attempt to recalculate the y axis range whenever a redraw event is triggered.
   * @name elasticY
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Boolean} [elasticY=false]
   * @return {Boolean}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.elasticY = function (elasticY) {
    if (!arguments.length) {
      return _yElasticity
    }
    _yElasticity = elasticY
    return _chart
  }

  /**
   * Turn on/off horizontal grid lines.
   * @name renderHorizontalGridLines
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Boolean} [renderHorizontalGridLines=false]
   * @return {Boolean}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.renderHorizontalGridLines = function (renderHorizontalGridLines) {
    if (!arguments.length) {
      return _renderHorizontalGridLine
    }
    _renderHorizontalGridLine = renderHorizontalGridLines
    return _chart
  }

  /**
   * Turn on/off vertical grid lines.
   * @name renderVerticalGridLines
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Boolean} [renderVerticalGridLines=false]
   * @return {Boolean}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.renderVerticalGridLines = function (renderVerticalGridLines) {
    if (!arguments.length) {
      return _renderVerticalGridLine
    }
    _renderVerticalGridLine = renderVerticalGridLines
    return _chart
  }

  /**
   * Set or get y axis padding for the elastic y axis. The padding will be added to the top of the y
   * axis if elasticY is turned on; otherwise it is ignored.
   *
   * padding can be an integer or percentage in string (e.g. "10%"). Padding can be applied to
   * number or date axes. When padding a date axis, an integer represents number of days being padded
   * and a percentage string will be treated the same as an integer.
   * @name yAxisPadding
   * @memberof dc.coordinateGridRasterMixin
   * @instance
   * @param {Number|String} [padding=0]
   * @return {Number}
   * @return {dc.coordinateGridRasterMixin}
   */
  _chart.yAxisPadding = function (padding) {
    if (!arguments.length) {
      return _yAxisPadding
    }
    _yAxisPadding = padding
    return _chart
  }

  _chart.yAxisHeight = function () {
    return _chart.effectiveHeight()
  }

  _chart._rangeBandPadding = function (_) {
    if (!arguments.length) {
      return _rangeBandPadding
    }
    _rangeBandPadding = _
    return _chart
  }

  _chart._outerRangeBandPadding = function (_) {
    if (!arguments.length) {
      return _outerRangeBandPadding
    }
    _outerRangeBandPadding = _
    return _chart
  }

  override(_chart, "filter", function (filter, isInverseFilter) {
    if (!arguments.length) {
      return _chart._filter()
    }

    _chart._filter(filter, isInverseFilter)

    if (filter) {
      _chart.brush().extent(filter)
    } else {
      _chart.brush().clear()
    }

    return _chart
  })

  _chart.brush = function (_) {
    if (!arguments.length) {
      return _brush
    }
    _brush = _
    return _chart
  }

  _chart.isBrushing = function (_) {
    if (!arguments.length) {
      return _isBrushing
    }
    _isBrushing = _
    return _chart
  }

  function brushHeight () {
    return _chart._xAxisY() - _chart.margins().top
  }

  _chart.fadeDeselectedArea = function () {
    // do nothing, sub-chart should override this function
  }

  // borrowed from Crossfilter example
  _chart.resizeHandlePath = function (d) {
    let e = Number(d === "e"),
      x = e ? 1 : -1,
      y = brushHeight() / 3
    return "M" + (0.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (0.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8)
  }

  function getClipPathId () {
    return _chart.anchorName().replace(/[ .#=\[\]]/g, "-") + "-clip"
  }

  _chart._preprocessData = function () {}

  function initGrid () {
    if (_gridInitted) {
      return
    }
    _chart.resetSvg()
    _chart.svg().style("position", "absolute")
    _chart._generateG()
    _gridInitted = true
  }


  function doChartRender (imgUrl, renderBounds, queryId) {
    initGrid()
    _chart._preprocessData()
    drawChart(true, imgUrl, renderBounds, queryId)
    _hasBeenRendered = true
    return _chart
  }

  _chart._doRender = function () {
    doChartRender()
  }

  function doChartRedraw (imgUrl, renderBounds, queryId) {
    if (!_hasBeenRendered) // guard to prevent a redraw before a render
      { return doChartRender(imgUrl, renderBounds, queryId) }

    _chart._preprocessData()

    drawChart(false, imgUrl, renderBounds, queryId)

    return _chart
  }

  _chart._doRedraw = function () {
    doChartRedraw()
  }

  _chart._drawScatterPlot = function (doFullRender, imgUrl, renderBounds, queryId) {
    if (doFullRender) {
      doChartRender(imgUrl, renderBounds, queryId)
    } else {
      doChartRedraw(imgUrl, renderBounds, queryId)
    }
  }

  _chart._destroyScatterPlot = function () {
    destroy()
  }

  function drawChart (render, imgUrl, renderBounds, queryId) {
    // prepare and render the chart first so the grid lines/axes
    // are drawn on top
    prepareChartBody()
    renderChart(imgUrl, renderBounds, queryId)

    const transitionDuration = (render ? _chart.transitionDuration() : 10)

    prepareXAxis(_chart.g(), _chart.x(), render, transitionDuration)
    _chart._prepareYAxis(_chart.g(), _chart.y(), transitionDuration)

    if (_chart.elasticX() || _resizing || render) {
      _chart.renderXAxis(_chart.g(), transitionDuration)
    }

    if (_chart.elasticY() || _resizing || render) {
      _chart.renderYAxis(_chart.g(), transitionDuration)
    }

    _chart.fadeDeselectedArea()
    _resizing = false
    _chart.map().fire("render", {})
  }

  _chart.init = function () {
    initGrid()
    return new Promise((resolve, reject) => {
      resolve(_chart)
    })
  }

  return _chart
}
