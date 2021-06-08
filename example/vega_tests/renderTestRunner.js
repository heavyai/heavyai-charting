// need to do this because mapd-conector::getResultRowForPixel() cannot be called
// synchronously currently
const runRenderTestSync = (w, con, render_test_config_list) => {
  const runRenderTest = idx => {
    if (idx === render_test_config_list.length) {
      return;
    }

    const render_test_config = render_test_config_list[idx];
    const render_test_name = render_test_config.test_name;
    if (!render_test_name) {
      throw new Error(`Render test at index ${idx} is not named. All render tests require a test name.`);
    }
    const vega = render_test_config.vega;
    if (vega === undefined) {
      throw new Error(`All render test configs require a "vega" property.`);
    }
    const hittest_pixel = new TPixel(render_test_config.hitInfo.pixel);
    const table_col_names = render_test_config.hitInfo.data_args;
    const expected_results = render_test_config.hitInfo.expected_results;

    const results = con.renderVega(1, JSON.stringify(vega))
    const blobUrl = "data:image/png;base64," + results.image
    w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

    const geocmp = (expected_geo_wkt, received_geo_wkt) => {
      // the polygon geo column will be a wkt string:
      // https://en.wikipedia.org/wiki/Well-known_text
      if (typeof received_geo_wkt !== "string") {
        throw new Error(`Received ${received_geo_wkt} but it is not a string`)
      }

      // We'll use the wellknown library from mapbox to convert the wkt string to geojson
      // https://github.com/mapbox/wellknown
      const geojson = wellknown.parse(received_geo_wkt)
      if (!geojson) {
        throw new Error(`Received "${received_geo_wkt}" but it is not a valid wkt string`)
      }

      const expected_geojson = wellknown.parse(expected_geo_wkt)
      if (!expected_geojson) {
        throw new Error(`Expected "${expected_geo_wkt}" is not a valid wkt string`)
      }

      if (geojson.type !== expected_geojson.type) {
        throw new Error(`Expected a ${expected_geojson.type} but got a ${geojson.type}`)
      }

      if (geojson.coordinates.length != expected_geojson.coordinates.length) {
        throw new Error(`Expected wkt has ${expected_geojson.coordinates.length} coords but got ${geojson.coordinates.length}`)
      }

      for (let i=0; i<geojson.coordinates.length; ++i) {
        const exp_coord = expected_geojson.coordinates[i]
        const rec_coord = geojson.coordinates[i]

        if (exp_coord.length !== rec_coord.length) {
          throw new Error(`Expected vertex at index ${i} has ${exp_coord.length} cordinates but got ${rec_coord.length}`)
        }

        for (let j=0; j<rec_coord.length; ++j) {
          if (Math.abs(exp_coord[j] - rec_coord[j]) > err_eps) {
            throw new Error(`Expected coordinate ${j} at vertex ${i} to be ${exp_coord[j]} but got ${rec_coord[j]}`)
          }
        }
      }
    }
    
    const hittestValidateCB = data => {
        const expected_vals = Object.entries(expected_results)
        for (const expected_val of expected_vals) {
          const key = expected_val[0];
          const val = expected_val[1];
          if (data[0].row_set === undefined || !data[0].row_set.length) {
            throw new Error(`Did not get hit-test results "${render_test_config.test_name}"`);
          }
          if (data[0].row_set[0][key] === undefined) {
            throw new Error(`Did not get expected key: "${key}" in the results for test "${render_test_config.test_name}"`);
          }
          if (key === "mapd_geo" || key === "omnisci_geo") {
            geocmp(val, data[0].row_set[0][key])
          } else if (data[0].row_set[0][key] !== val) {
            throw new Error(`Expecting ${val} for "${key}" in hittest results. Got ${data[0].row_set[0][key]} instead for test "${render_test_config.test_name}"`)
          }
        }
      }

    con.getResultRowForPixel(
      1, // widgetId
      hittest_pixel,
      table_col_names,
      (error, data) => {
        if (error) {
          throw error
        }
        hittestValidateCB(data)
        runRenderAndHitTest(++idx)
      }
    )
  }

  runRenderAndHitTest(0)
}