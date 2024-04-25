import * as _ from "lodash"
import { getRealLayers } from "../utils/utils-vega"
import assert from "assert"
import { format } from "d3-format"
import { logger } from "../utils/logger"

export const LEGEND_POSITIONS = {
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left"
}

const hasLegendOpenProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("open")
const hasLegendLockedProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("locked")
const hasLegendTitleProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("title")
const handleColorLegendOpenUndefined = color =>
  typeof color.legend.open === "undefined" ? true : color.legend.open
const handleNonStackedOpenState = state =>
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

async function getTopValues(layer) {
  const NUM_TOP_VALUES = 10
  const OFFSET = 0
  const dimension = layer?.getState()?.encoding?.color?.field
  if (dimension) {
    return layer
      .crossfilter()
      .dimension(dimension)
      .group()
      .topAsync(NUM_TOP_VALUES, OFFSET)
      .then(results => {
        if (results) {
          return results.map(result => result.key0)
        } else {
          return null
        }
      })
      .catch(error => {
        return null
      })
  } else {
    return Promise.resolve(null)
  }
}

function getUpdatedDomainRange(newDomain, oldDomain, range, defaultColor) {
  const oldDomainRange = new Map(
    [...oldDomain].map((key, index) => [key, range[index]])
  )
  const newDomainRange = new Map(
    [...newDomain].map(key => [key, oldDomainRange.get(key) ?? defaultColor])
  )
  return {
    newDomain: [...newDomainRange.keys()],
    newRange: [...newDomainRange.values()]
  }
}

export async function getLegendStateFromChart(chart, useMap, selectedLayer) {
  // the getLegendStateFromChart in _doRender gets called from few different options
  // and some of them are calling with all layers in chart.
  // As a result, a legend for each layer is rendered.
  // Thus, we need to remove extra legends here
  const legends = chart.root().selectAll(".legend")
  const layers = chart.getLayerNames()
  const _dimOrGroup = chart.group()

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
    await Promise.all(
      getRealLayers(chart.getLayerNames()).map(async layer_name => {
        const layer = chart.getLayer(layer_name)
        if (typeof layer.getPrimaryColorScaleAndLegend === "function") {
          // ... existing logic for primary color scale and legend
          const vega = chart.getMaterializedVegaSpec()
          const [
            color_scale,
            color_legend,
            legend_position
          ] = layer.getPrimaryColorScaleAndLegend()
          if (color_scale === null) {
            return {}
          }
          const color_scale_name = color_scale.name || ""
          const materialized_color_scale = vega.scales.find(
            scale => scale.name === color_scale_name
          )
          if (!materialized_color_scale) {
            return {}
          }

          return {
            ...materialized_color_scale,
            legend: color_legend,
            legend_position,
            version: 2.0
          }
        } else {
          // TODO(croot): this can be removed once all raster layer types are
          // transitioned to the getPrimaryColorScaleName/getLegendDefinitionForProperty
          // form above
          const layerState = layer.getState()
          const color = layer.getState().encoding.color

          let color_legend_descriptor = null

          if (
            (layers.length > 1 || _.isEqual(selectedLayer, layerState)) &&
            typeof color !== "undefined"
          ) {
            if (
              typeof color.scale === "object" &&
              color.scale.domain === "auto"
            ) {
              color_legend_descriptor = {
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
              color_legend_descriptor = {
                ...color,
                domain: layer.colorDomain()
              }
            } else if (color.type === "ordinal") {
              const colValues = await getTopValues(layer)
              const { newDomain, newRange } = colValues
                ? getUpdatedDomainRange(
                    colValues,
                    color.domain,
                    color.range,
                    color.defaultOtherRange
                  )
                : undefined
              color_legend_descriptor =
                newDomain && newRange
                  ? { ...color, domain: newDomain, range: newRange }
                  : { ...color }
            } else {
              color_legend_descriptor = { ...color }
            }
          } else {
            color_legend_descriptor = { ...color }
          }

          return {
            ...color_legend_descriptor,
            version: 1.0
          }
        }
      })
    ),
    chart,
    useMap
  )
}

export function handleLegendToggle() {
  console.log("toggling stacked legend")
  // when chart legend is collapsed, also collapse layer legends
  this.getLayers().forEach(l => {
    if (l.state?.encoding?.color) {
      l.setState(
        setLegendState(color => ({
          open: !this.legend().state.open
        }))
      )
    }
  })
  this.legend().setState({
    ...this.legend().state,
    open: !this.legend().state.open
  })
}

export function handleLegendDoneRender() {
  console.log("stacked legened done rendering")

  this.root().classed("horizontal-lasso-tools", () => {
    const legendNode = this.root()
      .select(".legendables")
      .node()
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
    setLegendState(color => ({
      open: hasLegendOpenProp(color)
        ? !handleColorLegendOpenUndefined(color)
        : false
    }))
  )
  this.legend().setState(getLegendStateFromChart(this))
}

export function handleLegendLock({ locked, index = 0 }) {
  const layer = this.getLayers()[index]

  if (layer?.getState()?.encoding?.color) {
    layer.setState(
      setLegendState(color => ({
        locked: typeof locked === "undefined" ? true : !locked
      }))
    )

    const {
      encoding: { color }
    } = layer.getState()
    let redraw = false
    if (
      typeof color.scale === "object" &&
      (color?.scale?.domain || typeof layer.colorDomain === "function")
    ) {
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
}

export function handleLegendInput({ domain, index = 0 }) {
  const layer = this.getLayers()[index]
  const { scale } = layer.getState().encoding.color

  const legendDomain =
    this.legend().state.domain || this.legend().state.list[index].domain
  if (_.difference(domain, legendDomain).length > 0) {
    // automatically lock color legend when min/max input changes
    layer.setState(
      setLegendState(color => ({
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
const commafy = d => format(",")(parseFloat(d.toFixed(2)))
const formatNumber = d => (String(d).length > 4 ? format(".2s")(d) : commafy(d))
const color_literal_alpha_regex = /^\s*[a-z,A-Z]{3}[aA]\s*\([\d.]+,[\d.]+,[\d.]+,([\d.]+)\)$/i

// eslint-disable-next-line complexity
function legendState_v1(state, useMap) {
  const position = useMap
    ? LEGEND_POSITIONS.BOTTOM_LEFT
    : LEGEND_POSITIONS.TOP_RIGHT
  if (state.type === "ordinal") {
    console.log("LEGEND STATE  ----  ", state)
    // NOTE(C):
    // maybe if i call topAsync function here i can get back an updated domain from the cf query?
    // TODO[C]: domain below is also incorrect
    return {
      type: "nominal",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      // When there is Other category (categories besides topN), we show it in the Color Palette in chart editor.
      // We also need to include the Other category in legend. Thus, when there is Other category exist in result
      // where hideOther is false we include Other in domain.
      // For it's color swatch, we have two options:
      // 1. When the Other toggle is enabled, we show color swatch (color defined from color palette in chart editor) for the Other category range,
      // 2. If the Other toggle is disabled, we don't include color swatch for the Other domain
      range:
        !state.hideOther &&
        state.hasOwnProperty("showOther") &&
        state.showOther === true
          ? state.range.concat([state.defaultOtherRange]) // When Other is toggled OFF, don't show color swatch in legend
          : state.range,
      domain: state.hideOther ? state.domain : state.domain.concat(["Other"]),
      position
    }
  } else if (
    state.type === "quantitative" &&
    state.domain &&
    isNullLegend(state.domain)
  ) {
    // handles quantitative legend for all null color measure column, ["NULL", "NULL"] domain
    return {
      type: "nominal", // show nominal legend with one "NULL" value when all null quantitavie color measure is selected
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain.slice(1),
      position
    }
  } else if (state.type === "quantitative") {
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain,
      position: LEGEND_POSITIONS.BOTTOM_LEFT
    }
  } else if (state.type === "quantize" && state.domain !== "auto-contour") {
    // Legend not supported for contour
    const { scale } = state
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: scale.range,
      domain: scale.domain,
      position: LEGEND_POSITIONS.BOTTOM_LEFT
    }
  } else {
    return {}
  }
}

// eslint-disable-next-line complexity
function legendState_v2(state, useMap) {
  const state_type =
    typeof state.type === "string" ? state.type.toLowerCase() : ""
  const { legend = {} } = state
  assert(typeof legend === "object")
  const { title = "Legend", open = true, locked = false } = legend

  // Try to default legend position, but take explicit legend_position if it exists
  let position = useMap
    ? LEGEND_POSITIONS.BOTTOM_LEFT
    : LEGEND_POSITIONS.TOP_RIGHT
  if (state.legend_position) {
    position = state.legend_position
  }

  if (state_type === "ordinal") {
    const extra_domain = []
    const extra_range = []
    if (
      !state.hideOther &&
      state.hasOwnProperty("showOther") &&
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
    } else if (state.hasOwnProperty("default")) {
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
    console.log(state.domain, extra_domain)
    console.log(state.range, extra_range)
    return {
      type: "nominal",
      title,
      open,
      position,
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
      position,
      domain: domain_labels,
      range: state.range
    }
  }

  const is_quantitative_type = isQuantitativeType(state_type)
  if (is_quantitative_type && state.domain && isNullLegend(state.domain)) {
    // handles quantitative legend for all null color measure column, ["NULL", "NULL"] domain
    return {
      type: "nominal", // show nominal legend with one "NULL" value when all null quantitavie color measure is selected
      title,
      open,
      position,
      domain: state.domain.slice(1),
      range: state.range
    }
  } else if (state_type === "quantize") {
    const errors = validateQuantizeDomain(state)
    // Failing domain validation, warn about problems and don't crash
    if (errors.length > 0) {
      errors.forEach(logger.warn)
      return {}
    }
    return {
      type: "gradient",
      title,
      locked,
      open,
      position,
      domain: state.domain,
      range: state.range
    }
  } else if (is_quantitative_type) {
    const { scale = {} } = state
    const domain = scale.domain || state.domain
    const range = scale.range || state.range
    // Safety valve
    if (!Array.isArray(domain)) {
      return {}
    }
    const min_size = Math.min(domain.length, range.length)
    // TODO(croot): may want to consider filling out the auto-gradient here
    // using a max-number of stops. The best way to do this will most likely
    // be to create a d3 scale of similar type, and generate new ranges from
    // it at auto-gradient stops. Unforunately the legendables library will only
    // auto fill the domain as long as the domain is only of size 2 and the range
    // has more than 2 values. Instead, we need to handle the case where there's
    // an implied gradient between multiple values in domain/range where there is
    // an equal number of domains as ranges. So if we have a domain of [0,100] and
    // a range of ["blue", "red"], a domain value of 50 would produce purple.
    // This is currently not accounted for in ledgendables gradient, and therefore
    // can result in a loss of legend color mapping. So, we would need to auto fill
    // in some more domain/range stops so the legendables library has data to
    // display. Because of the varied nature of the quantitative code (linear, pow, log, etc),
    // it would be best to generate a d3 scale to generate values at linear stops.
    return {
      type: "gradient",
      title,
      locked,
      open,
      position,
      range: range.slice(0, min_size),
      domain: domain.slice(0, min_size).map(formatNumber)
    }
  } else {
    return {}
  }
}

function validateQuantizeDomain(state) {
  const errors = []
  if (!Array.isArray(state.range)) {
    errors.push(
      `Range must be an array, but was ${JSON.stringify(state.range)}`
    )
  }
  if (!Array.isArray(state.domain)) {
    errors.push(
      `Domain must be an Array, but was ${JSON.stringify(state.domain)}`
    )
  }
  if (state.domain.length !== 2) {
    errors.push(
      `Domain must have length of exactly 2, but was ${state.domain.length}`
    )
  }
  if (typeof state.domain[0] !== "number") {
    errors.push(
      `Domain must be array of numbers but was ${JSON.stringify(state.domain)}`
    )
  }
  return errors
}
function legendState(state, useMap = true) {
  const { version = 1.0 } = state

  return version >= 2.0
    ? legendState_v2(state, useMap)
    : legendState_v1(state, useMap)
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

function isNullLegend(domain = []) {
  // only return true if there is more than one "NULL" value
  return Array.isArray(domain) && domain?.filter(d => d === "NULL")?.length > 1
}
