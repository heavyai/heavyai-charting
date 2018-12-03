import * as _ from "lodash"

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
const handleNonStackedNullLegend = state => // used for ["NULL", "NULL"} quantitative legend domain
  Object.assign({}, state, { type: 'nominal', range: state.range, domain: state.domain.slice(1), open: true })

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

  if(legends.size() > layers.length && selectedLayer && selectedLayer.currentLayer !== "master") {
    chart.root().selectAll(".legend")
      .filter((d, i) => i !== selectedLayer.currentLayer)
      .remove()
  }

  return toLegendState(
    chart.getLayerNames().map(layerName => {
      const layer = chart.getLayer(layerName)
      const layerState = layer.getState()
      const color = layer.getState().encoding.color

      if(layers.length > 1 || _.isEqual(selectedLayer, layerState)) {
        if (typeof color.scale === "object" && color.scale.domain === "auto") {
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
    }),
    chart,
    useMap
  )
}

export function handleLegendToggle() {
  // when chart legend is collapsed, also collapse layer legends
  this.getLayers().forEach(l =>
    l.setState(
      setLegendState(color => ({
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
    const legendNode = this.root()
      .select(".legendables")
      .node()
    const isHorizontal =
      legendNode &&
      legendNode.clientHeight > this.height() - LASSO_TOOL_VERTICAL_SPACE

    this.root()
      .select(".mapd-draw-button-control-group")
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

  layer.setState(
    setLegendState(color => ({
      locked: typeof locked === "undefined" ? true : !locked
    }))
  )

  const { encoding: { color } } = layer.getState()
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

  const legendDomain = this.legend().state.domain || this.legend().state.list[index].domain
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

function legendState(state, useMap = true) {
  if (state.type === "ordinal") {
    return {
      type: "nominal",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain,
      position: useMap ? "bottom-left" : "top-right"
    }
  } else if(state.type === "quantitative" && state.domain && isNullLegend(state.domain)) { // handles quantitative legend for all null color measure column, ["NULL", "NULL"] domain
    return {
      type: "nominal", // show nominal legend with one "NULL" value when all null quantitavie color measure is selected
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain.slice(1),
      position: useMap ? "bottom-left" : "top-right"
    }
  } else if (state.type === "quantitative") {
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain,
      position: "bottom-left"
    }
  } else if (state.type === "quantize") {
    const { scale } = state
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: scale.range,
      domain: scale.domain,
      position: "bottom-left"
    }
  } else {
    return {}
  }
}

export function toLegendState(states = [], chart, useMap) {
  if(states.length === 1 && states[0].domain && isNullLegend(states[0].domain)) { // handles legend for all null color measure column, ["NULL", "NULL"] domain
    return handleNonStackedNullLegend(states[0], useMap)
  } else
    if (states.length === 1) {
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
  return _.includes(domain, "NULL")
}