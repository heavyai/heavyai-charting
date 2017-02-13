import earcut from "earcut"
import d3 from "d3"
import {utils} from "../../src/utils"

export const DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
]

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
]


export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"]

export const HOURS = [
  '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
  '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
  '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
  '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
]

export const deepEquals = require("deep-equal") // eslint-disable-line global-require

export const deepClone = obj => JSON.parse(JSON.stringify(obj))

export const TIME_UNITS = {
  DATE: true,
  TIMESTAMP: true,
  date: true,
  datetime: true,
  timestamp: true,
  "timestamp without timezone": true,
  TIME: true
}

/* istanbul ignore next */
export const customTimeFormat = d3.time.format.utc.multi([
  [".%L", (d) => d.getUTCMilliseconds()],
  [":%S", (d) => d.getUTCSeconds()],
  ["%I:%M", (d) => d.getUTCMinutes()],
  ["%I %p", (d) => d.getUTCHours()],
  ["%a %d", (d) => d.getUTCDay() && d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b %d", (d) => d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b", (d) => d.getUTCMonth()],
  ["%Y", () => true]
])

export function extractTickFormat (timeBin) {
  return (tick) => {
    switch (timeBin) {
    case "year":
      return Math.ceil(tick)
    case "isodow":
      return DAYS[tick - 1]
    case "month":
      return MONTHS[tick - 1]
    case "quarter":
      return QUARTERS[tick - 1]
    case "hour":
    case "minute":
      return tick + 1
    default:
      return tick
    }
  }
}

function translateVertexIndexIntoLatLon (vertexIndexList, latLonList) {
  return vertexIndexList.map((i) => ([
    latLonList.vertices[i * latLonList.dimensions],
    latLonList.vertices[i * latLonList.dimensions + 1]
  ]))
}

function writePointInTriangleSqlTest (p0, p1, p2, px, py) {
  function writeSign (p0, p1) {
    return `((${px})-(${p1[0]}))*((${p0[1]})-(${p1[1]})) - ` + `((${p0[0]})-(${p1[0]}))*((${py})-(${p1[1]})) < 0.0)`
  }

  const b1 = writeSign(p0, p1)
  const b2 = writeSign(p1, p2)
  const b3 = writeSign(p2, p0)
  return `((${b1} = (${b2})) AND (${b2} = (${b3})))`
}

const LONGITUDE_INDEX = 0
const LATITUDE_INDEX = 1

function convertFeatureToCircleStmt ({geometry: {radius, center}}, px, py) {
  const lat2 = center[1]
  const lon2 = center[0]
  const meters = radius * 1000
  return `DISTANCE_IN_METERS(${lon2}, ${lat2}, ${px}, ${py}) < ${meters}`
}

export function convertGeojsonToSql (features, px, py) {
  let sql = ""
  const NUM_SIDES = 3
  const triangleTests = []
  const circleStmts = []

  features.map((feature) => {
    if (feature.properties.circle) {
      circleStmts.push(convertFeatureToCircleStmt(feature, px, py))
    } else {
      const data = earcut.flatten(feature.geometry.coordinates)
      const triangles = earcut(data.vertices, data.holes, data.dimensions)
      const result = translateVertexIndexIntoLatLon(triangles, data)
      for (let j = 0; j < result.length; j += NUM_SIDES) {
        const p2 = result[j + 2]
        const p1 = result[j + 1]
        const p0 = result[j]
        triangleTests.push(writePointInTriangleSqlTest(p0, p1, p2, px, py))
      }
    }
  })

  if (triangleTests.length) {
    const triangleClause = triangleTests.map((clause, index) => {
      if (triangleTests.length - 1 === index) {
        return clause.substring(0, clause.length - 4)
      } else {
        return clause.substring(0, clause.length - 3)
      }
    }).join(" OR (")

    sql = sql + `(${px} IS NOT NULL AND ${py} IS NOT NULL AND (${triangleClause}))`
  }

  if (circleStmts.length) {
    if (triangleTests.length) {
      sql = sql + ` OR (${circleStmts.join(" OR ")})`
    } else {
      sql = sql + `(${circleStmts.join(" OR ")})`
    }
  }

  return `(${sql})`
}

export function xDomain (extract, currentLowValue, currentHighValue, timeBin) {
  if (extract) {
    switch (timeBin) {
    case "year":
      return [
        currentLowValue.getFullYear(),
        currentHighValue.getFullYear()
      ]
    case "quarter":
      return [1, 4] // eslint-disable-line no-magic-numbers
    case "isodow":
      return [1, 7] // eslint-disable-line no-magic-numbers
    case "month":
      return [1, 12] // eslint-disable-line no-magic-numbers
    case "day":
      return [1, 31] // eslint-disable-line no-magic-numbers
    case "hour":
      return [0, 23] // eslint-disable-line no-magic-numbers
    case "minute":
      return [0, 59] // eslint-disable-line no-magic-numbers
    default:
      return [1, 7] // eslint-disable-line no-magic-numbers
    }
  } else {
    return [currentLowValue, currentHighValue]
  }
}

export function xScale (extract, isChartDate) {
  if (extract || !isChartDate) {
    return d3.scale.linear()
  } else {
    return d3.time.scale.utc()
  }
}

export function xAxisTickFormat ({extract, timeBin}, isChartDate) {
  if (extract) {
    return utils.extractTickFormat(timeBin)
  } else if (isChartDate) {
    return customTimeFormat
  } else {
    return d3.format(".2s")
  }
}
