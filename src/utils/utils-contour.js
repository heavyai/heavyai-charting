
const buildParamsSQL = (params = {}) => Object.entries(params).reduce((prev, [key, val]) => {
  prev.push(`${key} => ${val}`)
  return prev
}, []).join(", ")

export const buildContourSQL = ({
  table,
  contour_interval,
  agg_type = 'AVG',
  bin_dim_meters = 180,
  contour_offset = 0.0,
  contour_value_field = 'z',
  lat_field = 'raster_lat',
  lon_field = 'raster_lon'
}) => {
  const contourParams = {
    contour_interval,
    agg_type,
    bin_dim_meters,
    contour_offset
  }
  const rasterSelect = `select ${lon_field}, ${lat_field},  ${contour_value_field} from ${table}`
  const contourParamsSQL = buildParamsSQL(contourParams)
  // Transform params object into 'param_name' => 'param_value', ... for sql query
  return `select contour_lines, contour_values from table(tf_raster_contour_lines(raster => cursor(${rasterSelect}), ${contourParamsSQL}))`
}
