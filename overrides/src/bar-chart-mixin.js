import {EXTRACT_UNIT_NUM_BUCKETS, MILLISECONDS_IN_SECOND, TIME_UNIT_PER_SECONDS} from "./time-unit-helpers"

const getConservativeDateTruncBucket = (binUnit) => (
  TIME_UNIT_PER_SECONDS[binUnit] * MILLISECONDS_IN_SECOND
)

const getDateExtractBucket = (binUnit) => (EXTRACT_UNIT_NUM_BUCKETS[binUnit])

export default function barChartMixin (chart) {
  chart.getTimeBinSize = (binParams) => {
    if (binParams.extract && binParams.timeBin !== "year") {
      return getDateExtractBucket(binParams.timeBin)
    }
    return Math.ceil((binParams.binBounds[1] - binParams.binBounds[0]) / getConservativeDateTruncBucket(binParams.timeBin))
  }
  return chart
}
