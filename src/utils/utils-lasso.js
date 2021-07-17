import wellknown from "wellknown"

const coordinates = index => features =>
  features
    .map(feature => feature.geometry.coordinates[0].map(c => c[index]))
    .reduce((accum, coords) => accum.concat(coords), [])

const LONGITUDE_INDEX = 0
const LATITUDE_INDEX = 1

const longitudes = coordinates(LONGITUDE_INDEX)
const latitudes = coordinates(LATITUDE_INDEX)

function convertFeaturesToUnlikelyStmt(features, px, py) {
  const lons = longitudes(features)
  const lats = latitudes(features)
  const left = Math.max(...lons)
  const right = Math.min(...lons)
  const top = Math.min(...lats)
  const bottom = Math.max(...lats)
  return `UNLIKELY( ${px} >= ${right} AND ${px} <= ${left} AND ${py} >= ${top} AND ${py} <= ${bottom})`
}

function convertFeatureToCircleStmt({ geometry: { radius, center } }, px, py) {
  const lat2 = center[1]
  const lon2 = center[0]
  const meters = radius * 1000
  return `DISTANCE_IN_METERS(${lon2}, ${lat2}, ${px}, ${py}) < ${meters}`
}

function convertFeatureToContainsStmt({ geometry }, px, py) {
  return `ST_Contains(${wellknown.stringify(geometry)}, ST_Point(${px}, ${py}))`
}

export function convertGeojsonToSql(features, px, py) {
  let sql = ""
  const polyStmts = []
  const circleStmts = []

  features.forEach(feature => {
    if (feature.properties.circle) {
      circleStmts.push(convertFeatureToCircleStmt(feature, px, py))
    } else {
      polyStmts.push(convertFeatureToContainsStmt(feature, px, py))
    }
  })

  if (polyStmts.length) {
    sql = sql + `(${polyStmts.join(" OR ")})`
  }

  if (circleStmts.length) {
    if (polyStmts.length) {
      sql = sql + ` OR (${circleStmts.join(" OR ")})`
    } else {
      sql = sql + `(${circleStmts.join(" OR ")})`
    }

    sql = `(${sql})`
  }

  if (polyStmts.length) {
    const unlikelyStmt = convertFeaturesToUnlikelyStmt(features, px, py)
    return `(${unlikelyStmt}) AND ${sql}`
  } else {
    return sql
  }
}
