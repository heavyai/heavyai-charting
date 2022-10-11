import * as _ from "lodash"
import { getRealLayers } from "../utils/utils-vega"
import assert from "assert"
import { format } from "d3-format"

const hasLegendOpenProp = (color) =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("open")
const hasLegendLockedProp = (color) =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("locked")
const hasLegendTitleProp = (color) =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("title")
const handleColorLegendOpenUndefined = (color) =>
  typeof color.legend.open === "undefined" ? true : color.legend.open
const handleNonStackedOpenState = (state) =>
  state.type === "gradient" ? Object.assign({}, state, { open: true }) : state
const handleNonStackedNullLegend = (
  state // used for ["NULL", "NULL"} quantitative legend domain
) =>
  Object.assign({}, state, {
    type: "nominal",
    range: state.range,
    domain: state.domain.slice(1),
    open: true
  })

const TOP_PADDING = 56
const LASSO_TOOL_VERTICAL_SPACE = 120

function setLegendState(setter) {
  return function setState(state) {
    return {
      ...state,
      encoding: {
        ...state.encoding,
        color: {
          ...state.encoding.color,
          legend: {
            ...state.encoding.color.legend,
            ...setter(state.encoding.color)
          }
        }
      }
    }
  }
}

function setColorState(setter) {
  return function setState(state) {
    return {
      ...state,
      encoding: {
        ...state.encoding,
        color: {
          ...state.encoding.color,
          ...setter(state.encoding.color)
        }
      }
    }
  }
}

function setColorScaleDomain_v2(domain) {
  return function setState(state) {
    return {
      ...state,
      encoding: {
        ...state.encoding,
        color: {
          ...state.encoding.color,
          scale: {
            ...state.encoding.color.scale,
            domain
          }
        }
      }
    }
  }
}

function setColorScaleDomain_v1(domain) {
  return function setState(state) {
    return {
      ...state,
      encoding: {
        ...state.encoding,
        color: {
          ...state.encoding.color,
          domain
        }
      }
    }
  }
}

export function getLegendStateFromChart(chart, useMap, selectedLayer) {
  // the getLegendStateFromChart in _doRender gets called from few different options
  // and some of them are calling with all layers in chart.
  // As a result, a legend for each layer is rendered.
  // Thus, we need to remove extra legends here
  const legends = chart.root().selectAll(".legend")
  const layers = chart.getLayerNames()

  if (
    legends.size() > layers.length &&
    selectedLayer &&
    selectedLayer.currentLayer !== "master"
  ) {
    chart
      .root()
      .selectAll(".legend")
      .filter((d, i) => i !== selectedLayer.currentLayer)
      .remove()
  }

  return toLegendState(
    getRealLayers(chart.getLayerNames()).map((layer_name) => {
      const layer = chart.getLayer(layer_name)
      if (typeof layer.getPrimaryColorScaleAndLegend === "function") {
        const vega = chart.getMaterializedVegaSpec()
        const [color_scale, color_legend] =
          layer.getPrimaryColorScaleAndLegend()
        const color_scale_name = color_scale ? color_scale.name : ""
        const materialized_color_scale = vega.scales.find(
          (scale) => scale.name === color_scale_name
        )
        assert(materialized_color_scale, `${layer_name}, ${color_scale_name}`)

        return {
          ...materialized_color_scale,
          legend: color_legend
        }
      } else {
        // TODO(croot): this can be removed once all raster layer types are
        // transitioned to the getPrimaryColorScaleName/getLegendDefinitionForProperty
        // form above
        const layerState = layer.getState()
        const color = layer.getState().encoding.color

        if (layers.length > 1 || _.isEqual(selectedLayer, layerState)) {
          if (
            typeof color.scale === "object" &&
            color.scale.domain === "auto"
          ) {
            return {
              ...color,
              scale: {
                ...color.scale,
                domain: layer.colorDomain()
              }
            }
          } else if (
            typeof color.scale === "undefined" &&
            color.domain === "auto"
          ) {
            return {
              ...color,
              domain: layer.colorDomain()
            }
          } else {
            return color
          }
        } else {
          return color
        }
      }
    }),
    chart,
    useMap
  )
}

export function handleLegendToggle() {
  // when chart legend is collapsed, also collapse layer legends
  this.getLayers().forEach((l) =>
    l.setState(
      setLegendState((color) => ({
        open: !this.legend().state.open
      }))
    )
  )
  this.legend().setState({
    ...this.legend().state,
    open: !this.legend().state.open
  })
}

export function handleLegendDoneRender() {
  this.root().classed("horizontal-lasso-tools", () => {
    const legendNode = this.root().select(".legendables").node()
    const isHorizontal =
      legendNode &&
      legendNode.clientHeight > this.height() - LASSO_TOOL_VERTICAL_SPACE

    this.root()
      .select(".heavyai-draw-button-control-group")
      .style("width", isHorizontal ? legendNode.clientWidth + 2 + "px" : "auto")

    return isHorizontal
  })
}

export function handleLegendOpen(index = 0) {
  this.getLayers()[index].setState(
    setLegendState((color) => ({
      open: hasLegendOpenProp(color)
        ? !handleColorLegendOpenUndefined(color)
        : false
    }))
  )
  this.legend().setState(getLegendStateFromChart(this))
}

export function handleLegendLock({ locked, index = 0 }) {
  const layer = this.getLayers()[index]

  layer.setState(
    setLegendState((color) => ({
      locked: typeof locked === "undefined" ? true : !locked
    }))
  )

  const {
    encoding: { color }
  } = layer.getState()
  let redraw = false
  if (typeof color.scale === "object") {
    // this if or raster-layer-heatmap-mixin.js
    if (color.legend.locked) {
      const colorDomain = color.scale.domain || layer.colorDomain()
      layer.setState(setColorScaleDomain_v2(colorDomain))
    } else {
      layer.setState(setColorScaleDomain_v2("auto"))
      redraw = true
    }
  } else if (
    typeof color.scale === "undefined" &&
    typeof color.domain !== "undefined"
  ) {
    if (color.legend.locked && color.domain === "auto") {
      layer.setState(setColorScaleDomain_v1(layer.colorDomain()))
    } else if (!color.legend.locked) {
      layer.setState(setColorScaleDomain_v1("auto"))
      redraw = true
    }
  }

  if (redraw) {
    this.renderAsync() // not setting the state for the legend here because it'll happen on the redraw
  } else {
    this.legend().setState(getLegendStateFromChart(this))
  }
}

export function handleLegendInput({ domain, index = 0 }) {
  const layer = this.getLayers()[index]
  const { scale } = layer.getState().encoding.color

  const legendDomain =
    this.legend().state.domain || this.legend().state.list[index].domain
  if (_.difference(domain, legendDomain).length > 0) {
    // automatically lock color legend when min/max input changes
    layer.setState(
      setLegendState((color) => ({
        locked: true
      }))
    )
  }

  if (typeof scale === "object") {
    layer.setState(setColorScaleDomain_v2(domain))
  } else {
    layer.setState(
      setColorState(() => ({
        domain
      }))
    )
  }

  this.legend().setState(getLegendStateFromChart(this))
  this.renderAsync()
}

function isQuantitativeType(type_string) {
  return (
    type_string === "quantitative" ||
    type_string === "linear" ||
    type_string === "pow" ||
    type_string === "sqrt" ||
    type_string === "log" ||
    type_string === "quantize"
  )
}

// Taken from: https://github.com/mrblueblue/legendables/blob/master/src/legend.ts#L47
const commafy = (d) => format(",")(parseFloat(d.toFixed(2)))
const formatNumber = (d) =>
  String(d).length > 4 ? format(".2s")(d) : commafy(d)
const color_literal_alpha_regex =
  /^\s*[a-z,A-Z]{3}[aA]\s*\([\d.]+,[\d.]+,[\d.]+,([\d.]+)\)$/i

// eslint-disable-next-line complexity
function legendState(state, useMap = true) {
  const state_type =
    typeof state.type === "string" ? state.type.toLowerCase() : ""
  const { legend = {} } = state
  assert(typeof legend === "object")
  const { title = "Legend", open = true, locked = false } = legend
  const position = useMap ? "bottom-left" : "top-right"

  if (state_type === "ordinal") {
    const extra_domain = []
    const extra_range = []
    if (
      !state.hideOther &&
      Object.hasOwn(state, "showOther") &&
      state.showOther
    ) {
      // When there is Other category (categories besides topN), we show it in the Color Palette in chart editor.
      // We also need to include the Other category in legend. Thus, when there is Other category exist in result
      // where hideOther is false we include Other in domain.
      // For it's color swatch, we have two options:
      // 1. When the Other toggle is enabled, we show color swatch (color defined from color palette in chart editor) for the Other category range,
      // 2. If the Other toggle is disabled, we don't include color swatch for the Other domain
      extra_domain.push("Other")
      extra_range.push(state.defaultOtherRange)
    } else if (Object.hasOwn(state, "default")) {
      let alpha_val = 1
      const match = state.default.match(color_literal_alpha_regex)
      if (match) {
        alpha_val = Number(match[1])
      }
      if (alpha_val > 0) {
        extra_domain.push("Other")
        extra_range.push(state.default)
      }
    }
    return {
      type: "nominal",
      title,
      open,
      domain: [...state.domain, ...extra_domain],
      range: [...state.range, ...extra_range]
    }
  } else if (state_type === "threshold") {
    const domain_labels = state.domain
      ? state.domain.map((item, index, range_array) => {
          if (index === 0) {
            return `< ${formatNumber(item)}`
          } else {
            return `[${formatNumber(range_array[index - 1])}, ${formatNumber(
              item
            )})`
          }
        })
      : []
    if (state.domain && state.domain.length) {
      domain_labels.push(
        `>= ${formatNumber(state.domain[state.domain.length - 1])}`
      )
    }
    return {
      type: "nominal",
      title,
      open,
      domain: domain_labels,
      range: state.range,
      position
    }
  }

  const is_quantitative_type = isQuantitativeType(state_type)
  if (is_quantitative_type && state.domain && isNullLegend(state.domain)) {
    // handles quantitative legend for all null color measure column, ["NULL", "NULL"] domain
    return {
      type: "nominal", // show nominal legend with one "NULL" value when all null quantitavie color measure is selected
      title,
      open,
      domain: state.domain.slice(1),
      range: state.range,
      position
    }
  } else if (state_type === "quantize") {
    assert(Array.isArray(state.range))
    assert(Array.isArray(state.domain))
    assert(state.domain.length === 2)
    assert(typeof state.domain[0] === "number")
    const range_diff = (state.domain[1] - state.domain[0]) / state.range.length
    let curr_val = state.domain[0]
    const domain_labels = state.range.map((item, index, range_array) => {
      const prev_val = curr_val
      curr_val += range_diff
      if (index === 0) {
        return `< ${formatNumber(curr_val)}`
      } else if (index === range_array.length - 1) {
        return `>= ${formatNumber(prev_val)}`
      } else {
        return `[${formatNumber(prev_val)}, ${formatNumber(curr_val)})`
      }
    })
    return {
      type: "nominal",
      title,
      open,
      domain: domain_labels,
      range: state.range,
      position
    }
  } else if (is_quantitative_type) {
    const { scale = {} } = state
    const domain = scale.domain || state.domain
    const range = scale.range || state.range
    const min_size = Math.min(domain.length, range.length)
    return {
      type: "gradient",
      title,
      locked,
      open,
      range: range.slice(0, min_size),
      domain: domain.slice(0, min_size),
      position: "bottom-left"
    }
  } else {
    return {}
  }
}

export function toLegendState(states = [], chart, useMap) {
  if (
    states.length === 1 &&
    states[0].domain &&
    isNullLegend(states[0].domain)
  ) {
    // handles legend for all null color measure column, ["NULL", "NULL"] domain
    return handleNonStackedNullLegend(states[0], useMap)
  } else if (states.length === 1) {
    return handleNonStackedOpenState(legendState(states[0], useMap))
  } else if (states.length) {
    return {
      type: "stacked",
      list: states.map(legendState),
      open:
        typeof chart.legendOpen() === "undefined" ? true : chart.legendOpen(),
      maxHeight: chart.height() - TOP_PADDING
    }
  } else {
    return {}
  }
}

function isNullLegend(domain) {
  // only return true if there is more than one "NULL" value
  return domain.reduce((cnt, d) => (d === "NULL" ? cnt + 1 : cnt), 0) > 1
}
