import { adjustOpacity } from "./utils-vega"

export const CONTOUR_TYPE = "contour"
export const CONTOUR_COLOR_SCALE = "contour_color"
export const CONTOUR_STROKE_WIDTH_SCALE = "contour_width"

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
        parsedVal = val.toFixed(1)
      } else if (stringParams.includes(key)) {
        parsedVal = `'${val}'`
      } else if (typeof val === "boolean") {
        parsedVal = `${val}`.toUpperCase()
      }
      prev.push(`${key} => ${parsedVal}`)
      return prev
    }, [])
    .join(", ")

export const buildContourSQL = (
  state,
  mapBounds,
  isPolygons = false
) => {
  const data = state.data[0]
  const encoding = state.encoding
  const {
    table,
    minor_contour_interval,
    major_contour_interval,
    agg_type = "AVG",
    fill_agg_type = "AVG",
    bin_dim_meters = 180,
    contour_offset = 0.0,
    neighborhood_fill_radius = 0.0,
    fill_only_nulls = false,
    flip_latitude = false,
    contour_value_field = "z",
    lat_field = "raster_lat",
    lon_field = "raster_lon"
  } = data

  const contourParams = {
    contour_interval: minor_contour_interval,
    agg_type,
    fill_agg_type,
    bin_dim_meters,
    contour_offset,
    neighborhood_fill_radius,
    fill_only_nulls,
    flip_latitude
  }

  const rasterSelectFilter = mapBounds
    ? `where ${lat_field} >= ${mapBounds._sw.lat} AND ${lat_field} <= ${mapBounds._ne.lat} AND ${lon_field} >= ${mapBounds._sw.lng} AND ${lon_field} <= ${mapBounds._ne.lng}`
    : ""
  const rasterSelect = `select ${lon_field}, ${lat_field},  ${contour_value_field} from ${table} ${rasterSelectFilter}`

  // Transform params object into 'param_name' => 'param_value', ... for sql query
  const contourParamsSQL = buildParamsSQL(contourParams)

  const geometryColumn = isPolygons ? 'contour_polygons' : 'contour_lines';
  const contourLineCase = `CASE mod(cast(contour_values as int), ${major_contour_interval}) WHEN 0 THEN 1 ELSE 0 END as ${encoding.color.field} `
  const contourTableFunction = isPolygons ? 'tf_raster_contour_polygons' : 'tf_raster_contour_lines'
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
        scale:CONTOUR_COLOR_SCALE,
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

export const isContourType = (state = {}) =>
  state.data && state.data[0] && state.data[0].type === CONTOUR_TYPE
