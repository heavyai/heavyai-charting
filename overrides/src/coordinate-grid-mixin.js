import dc from "../../mapdc"

const DEFAULT_NUM_TICKS = 10
const MAX_TICK_WIDTH = 64
const DEFAULT_TIME_DIMENSION_INDEX = 0

export default function coordinateGridMixin (_chart) {
  _chart.popupTextAccessor = (arr) => () => (dc.utils.formatValue(arr[0].datum.data.key0))

  _chart.getNumTicksForXAxis = () => {
    const xDomain = _chart.x().domain()
    const timeBinParam = _chart.group().binParams()[DEFAULT_TIME_DIMENSION_INDEX]
    if (timeBinParam && timeBinParam.extract) {
      return xDomain[xDomain.length - 1] - xDomain[0]
    } else {
      const effectiveWidth = _chart.effectiveWidth()
      const numTicks = _chart.xAxis().scale().ticks().length
      return effectiveWidth / numTicks < MAX_TICK_WIDTH ? Math.ceil(effectiveWidth / MAX_TICK_WIDTH) : DEFAULT_NUM_TICKS
    }
  }

  return _chart
}
