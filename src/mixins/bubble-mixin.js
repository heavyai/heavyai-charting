import colorMixin from "./color-mixin"
import d3 from "d3"
import { transition } from "../core/core"
/**
 * This Mixin provides reusable functionalities for any chart that needs to visualize data using bubbles.
 * @name bubbleMixin
 * @memberof dc
 * @mixin
 * @mixes dc.colorMixin
 * @param {Object} _chart
 * @return {dc.bubbleMixin}
 */
export default function bubbleMixin(_chart) {
  let _maxBubbleRelativeSize = 0.3

  /* OVERRIDE ---------------------------------------------------------------- */
  let _minRadiusWithLabel = 2
  /* ------------------------------------------------------------------------- */

  _chart.BUBBLE_NODE_CLASS = "node"
  _chart.BUBBLE_CLASS = "bubble"
  _chart.MIN_RADIUS = 10

  /* OVERRIDE ---------------------------------------------------------------- */
  _chart.accent = accentBubble
  _chart.unAccent = unAccentBubble
  /* ------------------------------------------------------------------------- */

  _chart = colorMixin(_chart)

  _chart.renderLabel(true)

  /* OVERRIDE ---------------------------------------------------------------- */
  _chart.setDataAsync((group, callbacks) => {
    if (_chart.cap() !== undefined) {
      return group
        .topAsync(_chart.cap())
        .then(result => {
          callbacks(null, result)
        })
        .catch(error => {
          callbacks(error)
        })
    } else {
      group.allAsync(callbacks)
    }
  })
  /* ------------------------------------------------------------------------- */

  _chart.data(group => {
    /* OVERRIDE ---------------------------------------------------------------- */
    if (_chart.dataCache !== null) {
      return _chart.dataCache
    } else {
      return group.top(_chart.cap() !== undefined ? _chart.cap() : Infinity)
    }
    /* ------------------------------------------------------------------------- */
  })

  let _r = d3.scale.linear().domain([0, 100])

  let _rValueAccessor = function(d) {
    return d.r
  }

  /**
   * Get or set the bubble radius scale. By default the bubble chart uses
   * {@link https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear d3.scale.linear().domain([0, 100])}
   * as its radius scale.
   * @name r
   * @memberof dc.bubbleMixin
   * @instance
   * @see {@link http://github.com/mbostock/d3/wiki/Scales d3.scale}
   * @param {d3.scale} [bubbleRadiusScale=d3.scale.linear().domain([0, 100])]
   * @return {d3.scale}
   * @return {dc.bubbleMixin}
   */
  _chart.r = function(bubbleRadiusScale) {
    if (!arguments.length) {
      return _r
    }
    _r = bubbleRadiusScale
    return _chart
  }

  /**
   * Get or set the radius value accessor function. If set, the radius value accessor function will
   * be used to retrieve a data value for each bubble. The data retrieved then will be mapped using
   * the r scale to the actual bubble radius. This allows you to encode a data dimension using bubble
   * size.
   * @name radiusValueAccessor
   * @memberof dc.bubbleMixin
   * @instance
   * @param {Function} [radiusValueAccessor]
   * @return {Function}
   * @return {dc.bubbleMixin}
   */
  _chart.radiusValueAccessor = function(radiusValueAccessor) {
    if (!arguments.length) {
      return _rValueAccessor
    }
    _rValueAccessor = radiusValueAccessor
    return _chart
  }

  _chart.rMin = function() {
    const min = d3.min(_chart.data(), e => _chart.radiusValueAccessor()(e))
    return min
  }

  _chart.rMax = function() {
    const max = d3.max(_chart.data(), e => _chart.radiusValueAccessor()(e))
    return max
  }

  _chart.bubbleR = function(d) {
    const value = _chart.radiusValueAccessor()(d)
    let r = _chart.r()(value)
    if (isNaN(r) || value <= 0) {
      r = 0
    }
    return r
  }

  const labelFunction = function(d) {
    return _chart.label()(d)
  }

  const shouldLabel = function(d) {
    return _chart.bubbleR(d) > _minRadiusWithLabel
  }

  const labelOpacity = function(d) {
    return shouldLabel(d) ? 1 : 0
  }

  const labelPointerEvent = function(d) {
    return shouldLabel(d) ? "all" : "none"
  }

  _chart._doRenderLabel = function(bubbleGEnter) {
    if (_chart.renderLabel()) {
      let label = bubbleGEnter.select("text")

      if (label.empty()) {
        label = bubbleGEnter
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", ".3em")
          .on("click", _chart.onClick)
      }

      label
        .attr("opacity", 0)
        .attr("pointer-events", labelPointerEvent)
        .html(labelFunction)

      transition(label, _chart.transitionDuration()).attr("opacity", 1)

      _chart.hideOverlappedLabels()
    }
  }

  _chart.doUpdateLabels = function(bubbleGEnter) {
    _chart._doRenderLabel(bubbleGEnter)
  }

  const titleFunction = function(d) {
    return _chart.title()(d)
  }

  _chart._doRenderTitles = function(g) {
    if (_chart.renderTitle()) {
      const title = g.select("title")

      if (title.empty()) {
        g.append("title").text(titleFunction)
      }
    }
  }

  _chart.doUpdateTitles = function(g) {
    if (_chart.renderTitle()) {
      g.selectAll("title").text(titleFunction)
    }
  }

  /**
   * Get or set the minimum radius. This will be used to initialize the radius scale's range.
   * @name minRadius
   * @memberof dc.bubbleMixin
   * @instance
   * @param {Number} [radius=10]
   * @return {Number}
   * @return {dc.bubbleMixin}
   */
  _chart.minRadius = function(radius) {
    if (!arguments.length) {
      return _chart.MIN_RADIUS
    }
    _chart.MIN_RADIUS = radius
    return _chart
  }

  /**
   * Get or set the minimum radius for label rendering. If a bubble's radius is less than this value
   * then no label will be rendered.
   * @name minRadiusWithLabel
   * @memberof dc.bubbleMixin
   * @instance
   * @param {Number} [radius=10]
   * @return {Number}
   * @return {dc.bubbleMixin}
   */

  _chart.minRadiusWithLabel = function(radius) {
    if (!arguments.length) {
      return _minRadiusWithLabel
    }
    _minRadiusWithLabel = radius
    return _chart
  }

  /**
   * Get or set the maximum relative size of a bubble to the length of x axis. This value is useful
   * when the difference in radius between bubbles is too great.
   * @name maxBubbleRelativeSize
   * @memberof dc.bubbleMixin
   * @instance
   * @param {Number} [relativeSize=0.3]
   * @return {Number}
   * @return {dc.bubbleMixin}
   */
  _chart.maxBubbleRelativeSize = function(relativeSize) {
    if (!arguments.length) {
      return _maxBubbleRelativeSize
    }
    _maxBubbleRelativeSize = relativeSize
    return _chart
  }

  _chart.fadeDeselectedArea = function() {
    if (_chart.hasFilter()) {
      _chart.selectAll("g." + _chart.BUBBLE_NODE_CLASS).each(function(d) {
        if (_chart.isSelectedNode(d)) {
          _chart.highlightSelected(this)
        } else {
          _chart.fadeDeselected(this)
        }
      })
    } else {
      _chart.selectAll("g." + _chart.BUBBLE_NODE_CLASS).each(function() {
        _chart.resetHighlight(this)
      })
    }
  }

  _chart.isSelectedNode = function(d) {
    /* OVERRIDE -----------------------------------------------------------------*/
    return _chart.hasFilter(d.key0) ^ _chart.filtersInverse()
    /* --------------------------------------------------------------------------*/
  }

  _chart.onClick = function(d) {
    /* OVERRIDE -----------------------------------------------------------------*/
    const filter = d.key0
    /* --------------------------------------------------------------------------*/
    _chart.handleFilterClick(d3.event, filter)
    _chart.updatePopup(d)
  }

  /* OVERRIDE -----------------------------------------------------------------*/
  function accentBubble(label) {
    _chart.selectAll("g." + _chart.BUBBLE_NODE_CLASS).each(function(d) {
      if (d.key0 === label) {
        _chart.accentSelected(this)
      }
    })
  }

  function unAccentBubble(label) {
    _chart.selectAll("g." + _chart.BUBBLE_NODE_CLASS).each(function(d) {
      if (d.key0 === label) {
        _chart.unAccentSelected(this)
      }
    })
  }
  /* --------------------------------------------------------------------------*/

  return _chart
}
