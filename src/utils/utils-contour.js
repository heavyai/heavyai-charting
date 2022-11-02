
const buildParamsSQL = (params = {}) => Object.entries(params).reduce((prev, [key, val]) => {
  const floatParams = ['contour_interval', 'contour_offset', 'bin_dim_meters']
  const stringParams = ['agg_type']
  let parsedVal = val;
  if (floatParams.includes(key)) {
    parsedVal = val.toFixed(1)
  } else if (stringParams.includes(key)) {
    parsedVal = `'${val}'`
  } else if (typeof val === 'boolean') {
    parsedVal = `${val}`.toUpperCase()
  }
  prev.push(`${key} => ${parsedVal}`)
  return prev
}, []).join(", ")

export const buildContourSQL = ({
  table,
  contour_interval,
  agg_type = 'AVG',
  bin_dim_meters = 180,
  contour_offset = 0.0,
  neighborhood_fill_radius = 0.0,
  fill_only_nulls = false,
  flip_latitude = false,
  contour_value_field = 'z',
  lat_field = 'raster_lat',
  lon_field = 'raster_lon'
}) => {
  const contourParams = {
    contour_interval,
    agg_type,
    bin_dim_meters,
    contour_offset,
    neighborhood_fill_radius,
    fill_only_nulls,
    flip_latitude
  }
  const rasterSelect = `select ${lon_field}, ${lat_field},  ${contour_value_field} from ${table}`
  const contourParamsSQL = buildParamsSQL(contourParams)
  // Transform params object into 'param_name' => 'param_value', ... for sql query
  return `select contour_lines, contour_values from table(tf_raster_contour_lines(raster => cursor(${rasterSelect}), ${contourParamsSQL}))`
}
