const hasLegendOpenProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("open")
const hasLegendLockedProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("locked")
const hasLegendTitleProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("title")
const handleColorLegendOpenUndefined = color =>
  typeof color.legend.open === "undefined" ? true : color.legend.open
const handleNonStackedOpenState = state =>
  state.type === "gradient" ? Object.assign({}, state, {open: true}) : state

const TOP_PADDING = 56
const LASSO_TOOL_VERTICAL_SPACE = 120

function setLegendState (setter) {
  return function setState (state) {
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

function setColorState (setter) {
  return function setState (state) {
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

function setColorScaleDomain (domain) {
  return function setState (state) {
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

export function getLegendStateFromChart (chart, useMap) {
  return toLegendState(chart.getLayerNames().map(
    layerName => {
      const layer = chart.getLayer(layerName)
      const color = layer.getState().encoding.color
      if (typeof color.scale === "object" && color.scale.domain === "auto") {
        return {
          ...color,
          scale: {
            ...color.scale,
            domain: layer.colorDomain()
          }
        }
      } else {
        return color
      }
    }
  ), chart, useMap)
}

export function handleLegendToggle () {
  this.legend().setState({
    ...this.legend().state,
    open: !this.legend().state.open
  })
}

export function handleLegendDoneRender () {
  this.root().classed("horizontal-lasso-tools", () => {
    const legendNode = this.root().select(".legendables").node()
    const isHorizontal = legendNode && legendNode.clientHeight > this.height() - LASSO_TOOL_VERTICAL_SPACE

    this.root().select(".mapd-draw-button-control-group")
      .style("width", isHorizontal ? legendNode.clientWidth + 2 + "px" : "auto")

    return isHorizontal
  })
}

export function handleLegendOpen (index = 0) {
  this.getLayers()[index].setState(
    setLegendState(color => ({
      open: hasLegendOpenProp(color) ? !handleColorLegendOpenUndefined(color) : false
    }))
  )
  this.legend().setState(getLegendStateFromChart(this))
}

export function handleLegendLock ({locked, index = 0}) {
  const layer = this.getLayers()[index]

  layer.setState(
    setLegendState(color => ({
      locked: typeof locked === "undefined" ? true : !locked
    }))
  )

  const {encoding: {color}} = layer.getState()
  if (typeof color.scale === "object") {
    if (color.legend.locked) {
      layer.setState(setColorScaleDomain(layer.colorDomain()))
    } else {
      layer.setState(setColorScaleDomain("auto"))
    }
  }

  this.legend().setState(getLegendStateFromChart(this))
}

export function handleLegendInput ({domain, index = 0}) {
  const layer = this.getLayers()[index]
  const {scale} = layer.getState().encoding.color

  if (typeof scale === "object") {
    layer.setState(setColorScaleDomain(domain))
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

function legendState (state, useMap = true) {
  if (state.type === "ordinal") {
    return {
      type: "nominal",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain,
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
      position: useMap ? "bottom-left" : "top-right"
    }
  } else if (state.type === "quantize") {
    const {scale} = state
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: scale.range,
      domain: scale.domain,
      position: useMap ? "bottom-left" : "top-right"
    }
  } else {
    return {}
  }
}

export function toLegendState (states = [], chart, useMap) {
  if (states.length === 1) {
    return handleNonStackedOpenState(legendState(states[0], useMap))
  } else if (states.length) {
    return {
      type: "stacked",
      list: states.map(legendState),
      open: typeof chart.legendOpen() === "undefined" ? true : chart.legendOpen(),
      maxHeight: chart.height() - TOP_PADDING
    }
  } else {
    return {}
  }
}
