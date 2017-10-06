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

function mapLayerColorState (chart) {
  return chart
    .getLayerNames()
    .map(layerName => chart.getLayer(layerName).getState().encoding.color)
}

export function handleLegendOpen (index = 0) {
  this.getLayers()[index].setState(
    setLegendState(color => ({
      open: hasLegendOpenProp(color) ? !color.legend.open : false
    }))
  )

  this.legend().setState(toLegendState(mapLayerColorState(this)))
}

export function handleLegendLock ({locked, index = 0}) {
  this.getLayers()[index].setState(
    setLegendState(color => ({
      locked: typeof locked === "undefined" ? true : !locked
    }))
  )

  this.legend().setState(toLegendState(mapLayerColorState(this)))
}

export function handleLegendInput ({domain, index = 0}) {
  this.getLayers()[index].setState(
    setColorState(() => ({
      domain
    }))
  )
  this.legend().setState(toLegendState(mapLayerColorState(this)))
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
