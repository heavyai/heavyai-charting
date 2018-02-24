import earcut from "earcut"

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

function translateVertexIndexIntoLatLon(vertexIndexList, latLonList) {
  return vertexIndexList.map(i => [
    latLonList.vertices[i * latLonList.dimensions],
    latLonList.vertices[i * latLonList.dimensions + 1]
  ])
}

function writePointInTriangleSqlTest(p0, p1, p2, px, py) {
  function writeSign(p0, p1) {
    return (
      `((${px})-(${p1[0]}))*((${p0[1]})-(${p1[1]})) - ` +
      `((${p0[0]})-(${p1[0]}))*((${py})-(${p1[1]})) < 0.0)`
    )
  }

  const b1 = writeSign(p0, p1)
  const b2 = writeSign(p1, p2)
  const b3 = writeSign(p2, p0)
  return `((${b1} = (${b2})) AND (${b2} = (${b3})))`
}

function convertFeatureToCircleStmt({ geometry: { radius, center } }, px, py) {
  const lat2 = center[1]
  const lon2 = center[0]
  const meters = radius * 1000
  return `DISTANCE_IN_METERS(${lon2}, ${lat2}, ${px}, ${py}) < ${meters}`
}

export function convertGeojsonToSql(features, px, py) {
  let sql = ""
  const NUM_SIDES = 3
  const triangleTests = []
  const circleStmts = []

  features.map(feature => {
    if (feature.properties.circle) {
      circleStmts.push(convertFeatureToCircleStmt(feature, px, py))
    } else {
      const data = earcut.flatten(feature.geometry.coordinates)
      const triangles = earcut(data.vertices, data.holes, data.dimensions)
      const result = translateVertexIndexIntoLatLon(triangles, data)
      for (let j = 0; j < result.length; j = j + NUM_SIDES) {
        const p2 = result[j + 2]
        const p1 = result[j + 1]
        const p0 = result[j]
        triangleTests.push(writePointInTriangleSqlTest(p0, p1, p2, px, py))
      }
    }
  })

  if (triangleTests.length) {
    const triangleClause = triangleTests
      .map((clause, index) => {
        if (triangleTests.length - 1 === index) {
          return clause.substring(0, clause.length - 4)
        } else {
          return clause.substring(0, clause.length - 3)
        }
      })
      .join(" OR (")
    sql =
      sql +
      `((${px} IS NOT NULL AND ${py} IS NOT NULL) AND (${triangleClause}))`
  }

  if (circleStmts.length) {
    if (triangleTests.length) {
      sql = sql + ` OR (${circleStmts.join(" OR ")})`
    } else {
      sql = sql + `(${circleStmts.join(" OR ")})`
    }

    sql = `(${sql})`
  }

  if (triangleTests.length) {
    const unlikelyStmt = convertFeaturesToUnlikelyStmt(features, px, py)
    return `(${unlikelyStmt}) AND ${sql}`
  } else {
    return sql
  }
}
