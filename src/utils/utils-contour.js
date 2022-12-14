import { adjustOpacity } from "./utils-vega"

export const CONTOUR_TYPE = "contour"
export const CONTOUR_COLOR_SCALE = "contour_color"
export const CONTOUR_STROKE_WIDTH_SCALE = "contour_width"

export const isContourType = (state = {}) =>
  state.data && state.data[0] && state.data[0].type === CONTOUR_TYPE

const buildParamsSQL = (params = {}) =>
  Object.entries(params)
    .reduce((prev, [key, val]) => {
      const floatParams = [
        "contour_interval",
        "contour_offset",
        "bin_dim_meters"
      ]
      const stringParams = ["agg_type", "fill_agg_type"]
      let parsedVal = val
      if (floatParams.includes(key)) {
        parsedVal = Number.parseFloat(val).toFixed(1)
      } else if (stringParams.includes(key)) {
        parsedVal = `'${val}'`
      } else if (typeof val === "boolean") {
        parsedVal = `${val}`.toUpperCase()
      }
      prev.push(`${key} => ${parsedVal}`)
      return prev
    }, [])
    .join(", ")

export const buildOptimizedContourSQL = ({
  state,
  filterTransforms = [],
  isPolygons = false
}) => {
  if (!isContourType(state)) {
    throw new Error(
      "Error generating SQL, attempting to generate contour layer sql for a non contour layer"
    )
  }
  const data = state.data[0]
  const {
    table,
    agg_type = "AVG",
    fill_agg_type = "AVG",
    bin_dim_meters = 180,
    contour_offset = 0.0,
    neighborhood_fill_radius = 0.0,
    fill_only_nulls = false,
    flip_latitude = false,
    contour_value_field,
    lat_field,
    lon_field,
    is_geo_point_type = false,
    intervals
  } = data

  const {
    isMajorFieldName = "is_major",
    minor: minorInterval,
    major: majorInterval
  } = intervals

  const contourParams = {
    contour_interval: minorInterval,
    agg_type,
    fill_agg_type,
    bin_dim_meters,
    contour_offset,
    neighborhood_fill_radius,
    fill_only_nulls,
    flip_latitude
  }

  const validRasterTransforms = filterTransforms.filter(ft => ft && ft.expr)
  const rasterSelectFilter = validRasterTransforms.length
    ? `where ${validRasterTransforms.map(ft => ft.expr).join(" AND ")}`
    : ""

  const BASE_MULTIPLIER = 100000.0
  const multiplier = Number.parseFloat(
    1 / Math.round((BASE_MULTIPLIER * 2.0) / bin_dim_meters)
  ).toFixed(10)

  const latFieldParsed = is_geo_point_type ? `ST_Y(${lat_field})` : lat_field
  const lonFieldParsed = is_geo_point_type ? `ST_X(${lon_field})` : lon_field
  // Aggregates rounded lat/lng
  const contourValueName = "agg_contour_value"
  const groupedQuery = `select
    cast((${lonFieldParsed}) / ${multiplier} as int) as lon_int,
    cast((${latFieldParsed}) / ${multiplier} as int) as lat_int,
    ${agg_type}(${contour_value_field}) as ${contourValueName}
  from
    ${table}
    ${rasterSelectFilter}
  group by lon_int, lat_int
  `

  // Converts rounded and grouped lat/lngs back to double values
  const rasterSelect = `select cast(lon_int * ${multiplier} as double) as ${lon_field}, cast(lat_int * ${multiplier} as double) as ${lat_field},  ${contourValueName} from (${groupedQuery})`

  // Transform params object into 'param_name' => 'param_value', ... for sql query
  const contourParamsSQL = buildParamsSQL(contourParams)

  const geometryColumn = isPolygons ? "contour_polygons" : "contour_lines"
  const contourLineCase = `CASE mod(cast(contour_values as int), ${majorInterval}) WHEN 0 THEN 1 ELSE 0 END as ${isMajorFieldName} `
  const contourTableFunction = isPolygons
    ? "tf_raster_contour_polygons"
    : "tf_raster_contour_lines"

  const sql = `select 
    ${geometryColumn}, 
    contour_values${isPolygons ? "" : ","}
    ${isPolygons ? "" : contourLineCase}
  from table(
    ${contourTableFunction}(
      raster => cursor(${rasterSelect}), ${contourParamsSQL}
    )
  )`
  return sql
}

export const buildContourSQL = ({
  state,
  filterTransforms = [],
  isPolygons = false
}) => {
  if (!isContourType(state)) {
    throw new Error(
      "Error generating SQL, attempting to generate contour layer sql for a non contour layer"
    )
  }
  const data = state.data[0]
  const {
    table,
    agg_type = "AVG",
    fill_agg_type = "AVG",
    bin_dim_meters = 180,
    contour_offset = 0.0,
    neighborhood_fill_radius = 0.0,
    fill_only_nulls = false,
    flip_latitude = false,
    contour_value_field,
    lat_field = "raster_lat",
    lon_field = "raster_lon",
    is_geo_point_type = false,
    intervals
  } = data

  const {
    isMajorFieldName = "is_major",
    minor: minorInterval,
    major: majorInterval
  } = intervals

  const contourParams = {
    contour_interval: minorInterval,
    agg_type,
    fill_agg_type,
    bin_dim_meters,
    contour_offset,
    neighborhood_fill_radius,
    fill_only_nulls,
    flip_latitude
  }

  const validRasterTransforms = filterTransforms.filter(ft => ft && ft.expr)
  const rasterSelectFilter = validRasterTransforms.length
    ? `where ${validRasterTransforms.map(ft => ft.expr).join(" AND ")}`
    : ""
  const rasterSelect = is_geo_point_type
    ? `select ST_X(${lon_field}), ST_Y(${lat_field}),  ${contour_value_field} from ${table} ${rasterSelectFilter}`
    : `select ${lon_field}, ${lat_field},  ${contour_value_field} from ${table} ${rasterSelectFilter}`

  // Transform params object into 'param_name' => 'param_value', ... for sql query
  const contourParamsSQL = buildParamsSQL(contourParams)

  const geometryColumn = isPolygons ? "contour_polygons" : "contour_lines"
  const contourLineCase = `CASE mod(cast(contour_values as int), ${majorInterval}) WHEN 0 THEN 1 ELSE 0 END as ${isMajorFieldName} `
  const contourTableFunction = isPolygons
    ? "tf_raster_contour_polygons"
    : "tf_raster_contour_lines"
  const sql = `select 
    ${geometryColumn}, 
    contour_values${isPolygons ? "" : ","}
    ${isPolygons ? "" : contourLineCase}
  from table(
    ${contourTableFunction}(
      raster => cursor(${rasterSelect}), ${contourParamsSQL}
    )
  )`

  return sql
}

export const getContourMarks = (layerName, state) => [
  {
    type: "lines",
    from: {
      data: layerName
    },
    properties: {
      x: {
        field: "x"
      },
      y: {
        field: "y"
      },
      strokeColor: {
        scale: CONTOUR_COLOR_SCALE,
        field: state.encoding.color.field
      },
      strokeWidth: {
        scale: CONTOUR_STROKE_WIDTH_SCALE,
        field: state.encoding.strokeWidth.field
      },
      lineJoin: state.mark.lineJoin
    }
  }
]

export const getContourScales = ({ strokeWidth, opacity, color }) => {
  const [minorOpacity, majorOpacity] = opacity.scale.range
  const [minorColor, majorColor] = color.scale.range

  return [
    {
      name: CONTOUR_STROKE_WIDTH_SCALE,
      type: "ordinal",
      domain: strokeWidth.scale.domain,
      range: strokeWidth.scale.range
    },
    {
      name: CONTOUR_COLOR_SCALE,
      type: "ordinal",
      domain: color.scale.domain,
      range: [
        adjustOpacity(minorColor, minorOpacity),
        adjustOpacity(majorColor, majorOpacity)
      ]
    }
  ]
}

export const validateContourState = state => {
  if (!state.data || !state.data.length) {
    throw new Error("Contour layer requires exactly 1 item in the data list")
  }

  const data = state.data[0]
  const { intervals } = data
  if (!intervals) {
    throw new Error("'intervals' is a required property of the data block")
  }
  if (intervals.major % intervals.minor !== 0) {
    throw new Error(
      "Minor interval must be a proper divisor of the major interval"
    )
  }
  if (!data.hasOwnProperty("lat_field") || !data.hasOwnProperty("lon_field")) {
    throw new Error(
      "Latitude and Longitude fields must be provided in data array"
    )
  }
}

export const getContourBoundingBox = (data, mapBounds) => {
  const table = data.table
  const isGeoPoint = data.is_geo_point_type
  const latField = isGeoPoint
    ? `(ST_Y(${table}.${data.lat_field}))`
    : `(${table}.${data.lat_field})`
  const lonField = isGeoPoint
    ? `(ST_X(${table}.${data.lon_field}))`
    : `(${table}.${data.lon_field})`
  const bboxFilter = `${lonField} >= ${mapBounds._sw.lng} AND ${lonField} <= ${mapBounds._ne.lng} AND ${latField} >= ${mapBounds._sw.lat} AND ${latField} <= ${mapBounds._ne.lat}`
  return bboxFilter
}
