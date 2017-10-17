const hasLegendOpenProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("open")
const hasLegendLockedProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("locked")
const hasLegendTitleProp = color =>
  typeof color.legend === "object" && color.legend.hasOwnProperty("title")

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

export function getLegendStateFromChart (chart) {
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
  ))
}

export function handleLegendOpen (index = 0) {
  this.getLayers()[index].setState(
    setLegendState(color => ({
      open: hasLegendOpenProp(color) ? !color.legend.open : false
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

function legendState (state) {
  if (state.type === "ordinal") {
    return {
      type: "nominal",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain
    }
  } else if (state.type === "quantitative") {
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: state.range,
      domain: state.domain
    }
  } else if (state.type === "quantize") {
    const {scale} = state
    return {
      type: "gradient",
      title: hasLegendTitleProp(state) ? state.legend.title : "Legend",
      locked: hasLegendLockedProp(state) ? state.legend.locked : false,
      open: hasLegendOpenProp(state) ? state.legend.open : true,
      range: scale.range,
      domain: scale.domain
    }
  } else {
    return {}
  }
}

export function toLegendState (states = []) {
  if (states.length === 1) {
    return legendState(states[0])
  } else if (states.length) {
    return {
      type: "stacked",
      list: states.map(legendState)
    }
  } else {
    return {}
  }
}
