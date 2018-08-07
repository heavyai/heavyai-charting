document.addEventListener("DOMContentLoaded", () => {
  const distrib_query1 = {
    "width": 800,
    "height": 563,
    "data": [
      {
        "name": "heatmap_querygeoheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(origin_lon),-14546993.689409198,-10666541.606038123,conv_4326_900913_y(origin_lat),1473107.5090960374,4203975.662771699,10,11.547005383792516,0,0,800,563) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(origin_lon),-14546993.689409198,-10666541.606038123,conv_4326_900913_y(origin_lat),1473107.5090960374,4203975.662771699,10,11.547005383792516,0,0,800,563) as y, count(*) as color FROM flights_123M WHERE ((origin_lon >= -131.838279376745 AND origin_lon <= -94.13194922158982) AND (origin_lat >= 12.693750655826506 AND origin_lat <= 36.56554018137399)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -14676170.125266952,
          -10478720.653287932
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          1424765.407333322,
          4378720.473242157
        ],
        "range": "height"
      },
      {
        "name": "heat_colorgeoheat",
        "type": "quantize",
        "domain": [
          1196,
          3097169.1465468
        ],
        "range": [
          "rgba(17,95,154,0.5)",
          "rgba(25,132,197,0.5)",
          "rgba(34,167,240,0.5)",
          "rgba(72,181,196,0.5)",
          "rgba(118,198,143,0.5)",
          "rgba(166,215,91,0.5)",
          "rgba(201,229,47,0.5)",
          "rgba(208,238,17,0.5)",
          "rgba(208,244,0,0.5)"
        ],
        "default": "rgba(13,8,135,0.5)",
        "nullValue": "rgba(13,8,135,0.5)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_querygeoheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 10,
          "height": 11.547005383792516,
          "fillColor": {
            "scale": "heat_colorgeoheat",
            "field": "color"
          }
        }
      }
    ]
  }

  const distrib_query2 = {
    "width": 800,
    "height": 563,
    "data": [
      {
        "name": "heatmap_querygeoheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(origin_lon),-14097261.734092662,-11320446.350884901,conv_4326_900913_y(origin_lat),1641412.1058710904,3595595.9318057233,10,11.547005383792516,0,0,800,563) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(origin_lon),-14097261.734092662,-11320446.350884901,conv_4326_900913_y(origin_lat),1641412.1058710904,3595595.9318057233,10,11.547005383792516,0,0,800,563) as y, count(*) as color FROM flights_123M WHERE ((origin_lon >= -126.6378568170624 AND origin_lon <= -101.69329981450251) AND (origin_lat >= 14.584941713458846 AND origin_lat <= 30.7134894845626)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -14097261.734092662,
          -11320446.350884901
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          1641412.1058710904,
          3595595.9318057233
        ],
        "range": "height"
      },
      {
        "name": "heat_colorgeoheat",
        "type": "quantize",
        "domain": [
          0,
          0
        ],
        "range": [
          "rgba(17,95,154,0.5)",
          "rgba(25,132,197,0.5)",
          "rgba(34,167,240,0.5)",
          "rgba(72,181,196,0.5)",
          "rgba(118,198,143,0.5)",
          "rgba(166,215,91,0.5)",
          "rgba(201,229,47,0.5)",
          "rgba(208,238,17,0.5)",
          "rgba(208,244,0,0.5)"
        ],
        "default": "rgba(13,8,135,0.5)",
        "nullValue": "rgba(13,8,135,0.5)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_querygeoheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 10,
          "height": 11.547005383792516,
          "fillColor": {
            "scale": "heat_colorgeoheat",
            "field": "color"
          }
        }
      }
    ]
  }

  const distrib_query3 = {
    "width": 800,
    "height": 633,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(longitude) as x, conv_4326_900913_y(latitude) as y, USA_contiguous_and_Hawaii_fire.rowid FROM USA_contiguous_and_Hawaii_fire WHERE ((longitude >= -140.62499999999886 AND longitude <= 140.62499999999835) AND (latitude >= -62.10010190721326 AND latitude <= 80.5334001504761)) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -15654303.390656125,
          15654303.390656067
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -8882917.714872453,
          15890017.400985535
        ],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
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
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "pointmap"
        },
        "properties": {
          "x": {
            "scale": "x",
            "field": "x"
          },
          "y": {
            "scale": "y",
            "field": "y"
          },
          "fillColor": {
            "scale": "pointmap_fillColor",
            "value": 0
          },
          "size": 10
        }
      }
    ]
  }

  const distrib_query4 = {
    "width": 800,
    "height": 633,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(longitude) as x, conv_4326_900913_y(latitude) as y, USA_contiguous_and_Hawaii_fire.rowid FROM USA_contiguous_and_Hawaii_fire WHERE ((longitude >= -155.680076051836 AND longitude <= -68.31515847385336) AND (latitude >= 3.3450586031751897 AND latitude <= 58.47523409056305)) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17330226.7903707,
          -7604808.653727728
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          372581.93753599504,
          8067819.038170805
        ],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
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
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "pointmap"
        },
        "properties": {
          "x": {
            "scale": "x",
            "field": "x"
          },
          "y": {
            "scale": "y",
            "field": "y"
          },
          "fillColor": {
            "scale": "pointmap_fillColor",
            "value": 0
          },
          "size": 10
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
      let results = con.renderVega(1, JSON.stringify(distrib_query1))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("distributedQueryUpdateTest", "distributedQueryUpdateTest")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // should be an empty image
      results = con.renderVega(1, JSON.stringify(distrib_query2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_query3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_query4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
