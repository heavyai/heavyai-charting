document.addEventListener("DOMContentLoaded", () => {
  // 2 layer test where 1 layer is a projected point query and the other a line aggregate query.
  // This should be rendered in 2 consecutive render_vega calls and render without error
  const multi_layer_proj_point_agg_line_test = {
    "width": 785,
    "height": 420,
    "data": [
      {
        "name": "pointmapLayer0",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, contributions.rowid FROM contributions WHERE ((contributions.lon >= -176.5998992919922 AND contributions.lon <= 145.7335968017578) AND (contributions.lat >= 0 AND contributions.lat <= 71.29952239990234) AND (contributions.lon >= -176.5998992919922 AND contributions.lon <= 145.7335968017578) AND (contributions.lat >= 0 AND contributions.lat <= 71.29952239990234) AND (contributions.lon >= -114.78176596580649 AND contributions.lon <= -77.39683644887923) AND (contributions.lat >= 28.71647459380675 AND contributions.lat <= 45.776138777536005)) AND (CAST(contrib_date AS TIMESTAMP(0)) BETWEEN '2014-06-08 00:00:00' AND '2015-11-20 23:59:59') LIMIT 2000000"
      },
      {
        "name": "linemapLayer1",
        "format": "lines",
        "sql": "SELECT uyanga_fault_lines.CODE as key0, LAST_SAMPLE(uyanga_fault_lines.rowid) as rowid, SAMPLE(uyanga_fault_lines.omnisci_geo) as omnisci_geo FROM uyanga_fault_lines WHERE ((ST_XMax(uyanga_fault_lines.omnisci_geo) >= -166.55649999999997 AND ST_XMin(uyanga_fault_lines.omnisci_geo) <= -66.97967199999998 AND ST_YMax(uyanga_fault_lines.omnisci_geo) >= 19.058081818181904 AND ST_YMin(uyanga_fault_lines.omnisci_geo) <= 71.2956928036173)) GROUP BY key0"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -12777447.73791315,
          -8615776.421317386
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          3339608.858246164,
          5744547.587479921
        ],
        "range": "height"
      },
      {
        "name": "pointmapLayer0_fillColor",
        "type": "linear",
        "domain": [
          0,
          0.125,
          0.25,
          0.375,
          0.5,
          0.625,
          0.75,
          0.875,
          1
        ],
        "range": [
          "rgba(17,95,154,0.475)",
          "rgba(25,132,197,0.5471153846153846)",
          "rgba(34,167,240,0.6192307692307691)",
          "rgba(72,181,196,0.6913461538461538)",
          "rgba(118,198,143,0.7634615384615384)",
          "rgba(166,215,91,0.835576923076923)",
          "rgba(201,229,47,0.85)",
          "rgba(208,238,17,0.85)",
          "rgba(208,244,0,0.85)"
        ],
        "accumulator": "density",
        "minDensityCnt": "-2ndStdDev",
        "maxDensityCnt": "2ndStdDev",
        "clamp": true
      },
      {
        "name": "linemapLayer1_fillColor",
        "type": "linear",
        "domain": [
          0,
          0.125,
          0.25,
          0.375,
          0.5,
          0.625,
          0.75,
          0.875,
          1
        ],
        "range": [
          "rgba(17,95,154,0.625)",
          "rgba(25,132,197,0.6971153846153846)",
          "rgba(34,167,240,0.7692307692307692)",
          "rgba(72,181,196,0.8413461538461539)",
          "rgba(118,198,143,0.9134615384615384)",
          "rgba(166,215,91,0.985576923076923)",
          "rgba(201,229,47,1)",
          "rgba(208,238,17,1)",
          "rgba(208,244,0,1)"
        ],
        "accumulator": "density",
        "minDensityCnt": "-2ndStdDev",
        "maxDensityCnt": "2ndStdDev",
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [
            -114.78176596580649,
            -77.39683644887923
          ],
          "y": [
            28.71647459380675,
            45.776138777536005
          ]
        }
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmapLayer0"
        },
        "properties": {
          "xc": {
            "scale": "x",
            "field": "x"
          },
          "yc": {
            "scale": "y",
            "field": "y"
          },
          "fillColor": {
            "scale": "pointmapLayer0_fillColor",
            "value": 0
          },
          "shape": "circle",
          "width": 2,
          "height": 2
        }
      },
      {
        "type": "lines",
        "from": {
          "data": "linemapLayer1"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "strokeColor": {
            "scale": "linemapLayer1_fillColor",
            "value": 0
          },
          "strokeWidth": 5,
          "lineJoin": "bevel"
        },
        "transform": {
          "projection": "mercator_map_projection"
        }
      }
    ]
  }

  new MapdCon()
    .protocol("http")
    .host("localhost")
    .port("9090")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect((error, con) => {
      if (error) {
        throw error
      }
      let results = con.renderVega(1, JSON.stringify(multi_layer_proj_point_agg_line_test))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("distributedMultiLayerTest", "distributedMultiLayerTest")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multi_layer_proj_point_agg_line_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
