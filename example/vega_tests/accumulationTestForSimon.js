document.addEventListener("DOMContentLoaded", () => {
  const contributionPctAccumulation = {
    "width": 746,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [-8266110.596414, -8204276.760372],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [4932723.938061, 5005415.994642],
        "range": "height"
      },
      {
        "name": "accum_fillColor",
        "type": "threshold",
        "domain": [0.25, 0.5, 0.75],
        "range": ["blue", "cyan", "yellow", "red"],
        "accumulator": "pct",
        "pctCategory": "R"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "square",
          "xc": {
            "scale": "x",
            "field": "x"
          },
          "yc": {
            "scale": "y",
            "field": "y"
          },
          "width": 5,
          "height": 5,
          "fillColor": {
            "scale": "accum_fillColor",
            "field": "color"
          }
        }
      }
    ]
  }

  const lineAccumulationVegas = [
    {
      "width": 1052,
      "height": 1057,
      "data": [
        {
          "name": "pointmap",
          "sql": "SELECT origin_lon as x1, origin_lat as y1, dest_lon as x2, dest_lat as y2, carrier_name, rowid FROM flights WHERE (((origin_lon >= -130.704671914419 AND origin_lon <= -63.48944119720274) AND (origin_lat >= 8.161828727775116 AND origin_lat <= 60.13379788749944)) OR ((dest_lon >= -130.704671914419 AND dest_lon <= -63.48944119720274) AND (dest_lat >= 8.161828727775116 AND dest_lat <= 60.13379788749944))) AND MOD(rowid * 2654435761, 4294967296) < 124472468",
          "format": {
            "type": "lines",
            "coords": {"x": ["x1","x2"],"y": ["y1","y2"]},
            "layout": "interleaved"
          }
        }
      ],
      "projections": [
        {
          "name": "projection",
          "type": "mercator",
          "bounds": {
            "x": [-130.704671914419,-63.48944119720274],
            "y": [8.161828727775116,60.13379788749944]
          }
        }
      ],
      "scales": [
        {
          "name": "linecolor",
          "type": "threshold",
          "domain": [0.25,0.5,0.75],
          "range": ["blue","green","red","orange"],
          "accumulator": "pct",
          "pctCategory": "American Airlines"
        }
      ],
      "marks": [
        {
          "type": "lines",
          "from": {"data": "pointmap"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "strokeColor": {"scale": "linecolor","field": "carrier_name"},
            "strokeWidth": 5
          },
          "transform": {"projection": "projection"}
        }
      ]
    },
    {
      "width": 1052,
      "height": 1057,
      "data": [
        {
          "name": "pointmap",
          "sql": "SELECT mapd_geo, rowid FROM kaggle_taxi_waypoints WHERE NOT(ST_XMin(mapd_geo) > -8.58182575664381 OR ST_XMax(mapd_geo) < -8.657827016599725 OR ST_YMin(mapd_geo) > 41.18795342561697 OR ST_YMax(mapd_geo) < 41.130461364579475) LIMIT 20000",
          "format": {
            "type": "lines",
            "coords": {"x": ["mapd_geo"],"y": [{"from": "mapd_geo"}]},
            "layout": "interleaved"
          }
        }
      ],
      "projections": [
        {
          "name": "projection",
          "type": "mercator",
          "bounds": {
            "x": [-8.657827016599725,-8.58182575664381],
            "y": [41.130461364579475,41.18795342561697]
          }
        }
      ],
      "scales": [
        {
          "name": "linecolor",
          "type": "linear",
          "domain": [0.001,0.999],
          "range": ["blue","red"],
          "accumulator": "density",
          "minDensityCnt": "-2ndStdDev",
          "maxDensityCnt": "2ndStdDev"
        }
      ],
      "marks": [
        {
          "type": "lines",
          "from": {"data": "pointmap"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "strokeColor": {"scale": "linecolor","value": 0},
            "strokeWidth": 5,
            "lineJoin": "round"
          },
          "transform": {"projection": "projection"}
        }
      ]
    }
  ]

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
      const w = window.open("accumulationTestForSimon", "accumulationTestForSimon results")
      for (i=0; i<5; ++i) {
        let results = con.renderVega(1, JSON.stringify(contributionPctAccumulation))
        let blobUrl = "data:image/png;base64," + results.image
        w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

        lineAccumulationVegas.forEach((line_accum_vega) => { // these should all run without error
            results = con.renderVega(1, JSON.stringify(line_accum_vega))
            blobUrl = "data:image/png;base64," + results.image
        })
      }

      let results = con.renderVega(1, JSON.stringify(contributionPctAccumulation))
      let blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
