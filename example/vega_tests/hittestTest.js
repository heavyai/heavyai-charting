document.addEventListener("DOMContentLoaded", () => {
  const poly_hittest_queries = [
    "SELECT rowid from zipcodes_2017",
    "SELECT rowid, ALAND10 as area from zipcodes_2017",
    "SELECT rowid, ZCTA5CE10 from zipcodes_2017",
    "SELECT zipcodes_2017.rowid, zipcodes_2017.ZCTA5CE10 as key0, avg(ALAND10) as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid, key0 HAVING key0 ilike '941__' ORDER BY rowid",
    "SELECT zipcodes_2017.rowid, contributions.contributor_zipcode as key0, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) GROUP BY zipcodes_2017.rowid, key0"
  ]
  const poly_hittest = {
      width: 1183,
      height: 1059,
      data: [
        {
          name: "zipcodes",
          format: "polys",
          sql: "SELECT rowid from zipcodes_2017"
        }
      ],
      projections: [
        {
          name: "merc",
          type: "mercator",
          bounds: {
            x: [-122.57, -122.1],
            y: [37.61, 37.94]
          }
        }
      ],
      marks: [
        {
          type: "polys",
          from: { data: "zipcodes" },
          properties: {
            x: { field: "x" },
            y: { field: "y" },
            fillColor: "red",
            strokeColor: "black",
            strokeWidth: 1,
            lineJoin: "round"
          },
          transform: { projection: "merc" }
        }
      ]
    }

  // need to do this because mapd-conector::getResultRowForPixel() cannot be called
  // synchronously currently
  const processRenderAndHitTestSync = (w, con, queries, basevega, hittest_pixel, table_col_names, hittestValidateCB) => {
    const runRenderAndHitTest = idx => {
      if (idx === queries.length) {
        return
      }

      basevega.data[0].sql = queries[idx]
      const results = con.renderVega(1, JSON.stringify(poly_hittest))
      // if (idx === 0) {
        const blobUrl = "data:image/png;base64," + results.image
        w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
      // }

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

  new MapdCon()
    .protocol("http")
    .host("localhost")
    .port("1024")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect((error, con) => {
      if (error) {
        throw error
      }

      const w = window.open("hittestTest", "hittestTest results")

      const zipcolname = "ZCTA5CE10"
      const geoname = "mapd_geo"
      const expected_wkt = "MULTIPOLYGON (((-122.477296992427 37.7660689771949,-122.47737896744 37.7654819925155,-122.458404937041 37.7661599627538,-122.457789956805 37.7660149977384,-122.457535985139 37.7635659732686,-122.455998995554 37.7639039735142,-122.456993927461 37.7618419834235,-122.459172970829 37.761911972315,-122.45594392645 37.7602389863507,-122.456602995497 37.7592349600788,-122.454001923303 37.7587849776069,-122.451816928783 37.7594529733804,-122.447681968309 37.7591899911683,-122.446782925374 37.7617809631684,-122.445308967701 37.7618799953544,-122.442914928516 37.7636479901912,-122.443346931806 37.765332962277,-122.441241984461 37.7652709781031,-122.438199940342 37.7671589598838,-122.435623930039 37.7673279809613,-122.435793998854 37.7690579638672,-122.429127955078 37.7694559785395,-122.428425970687 37.7704519581843,-122.42917799504 37.7741809830881,-122.429928929745 37.7779089602539,-122.430114924177 37.7788419918059,-122.444966986051 37.7769579914291,-122.444779985791 37.7760169970691,-122.446470950938 37.7758019593432,-122.446845957286 37.777668986366,-122.453187956686 37.7768529661823,-122.452809932853 37.7749949916149,-122.463748987049 37.7736239637125,-122.464610981971 37.7724399779795,-122.459161990536 37.7713139950164,-122.45990093912 37.7704419837196,-122.464401937306 37.7696689626992,-122.467003931509 37.7680129919984,-122.469757973435 37.7692089638529,-122.472244967926 37.768609993052,-122.473123978112 37.7671159607205,-122.477296992427 37.7660689771949)))"

      const geocmp = (expected_geo_wkt, received_geo_wkt) => {
        const err_eps = 0.000000000001

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

      processRenderAndHitTestSync(
        w,
        con,
        poly_hittest_queries,
        poly_hittest,
        new TPixel({ x: 326, y: poly_hittest.height - 544 - 1 }),
        { zipcodes: [zipcolname, geoname] },
        data => {
          const zip = data[0].row_set[0][zipcolname]
          const geom = data[0].row_set[0][geoname]
          if (zip !== "94117") {
            throw new Error(`Expecting zipcode 94117. Got ${zip} instead for vega: ${JSON.stringify(poly_hittest)}`)
          }
          geocmp(expected_wkt, geom)
        })
    })
})
