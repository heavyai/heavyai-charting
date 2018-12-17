document.addEventListener("DOMContentLoaded", () => {
  const distrib_vega = {
    "width": 725,
    "height": 840,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as key0, lat as key1, AVG(conv_4326_900913_x(lon)) as x, AVG(conv_4326_900913_y(lat)) as y, sqrt(count(*)) as size, COUNT(*) as color FROM tweets_nov_feb WHERE ((lon >= -122.43201432449264 AND lon <= -122.28978601419736) AND (lat >= 47.5554971856931 AND lat <= 47.666591057001455)) GROUP BY key0, key1"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13629069.489527,
          -13613236.706451
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          6033221.4324956,
          6051565.6225427
        ],
        "range": "height"
      },
      {
        "name": "pointmap_size",
        "type": "linear",
        "domain": [
          1,
          5
        ],
        "range": [
          3,
          10
        ],
        "clamp": true
      },
      {
        "name": "pointmap_fillColor",
        "type": "quantize",
        "domain": [
          1,
          10215
        ],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmap"
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
            "scale": "pointmap_fillColor",
            "field": "color"
          },
          "shape": "circle",
          "width": {
            "scale": "pointmap_size",
            "field": "size"
          },
          "height": {
            "scale": "pointmap_size",
            "field": "size"
          }
        }
      }
    ]
  }

  const distrib_vega2 = {
    "width": 800,
    "height": 405,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE ((lon >= -140.62499999999775 AND lon <= 140.6249999999975) AND (lat >= -36.87315716956392 AND lat <= 71.07667699623033)) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -15654303.390656002,
          15654303.390655972
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -4421441.248509404,
          11428540.934578234
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
          "size": 5
        }
      }
    ]
  }

  const distrib_vega3 = {
    "width": 800,
    "height": 405,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE ((lon >= -155.4343653252281 AND lon <= -69.6193508388522) AND (lat >= 16.0068263175974 AND lat <= 51.114997347421024)) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17290709.953315422,
          -7812521.616272879
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          1825868.1412489233,
          6624200.986885618
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
          "size": 5
        }
      }
    ]
  }

  // colors points by dict-encoded string via a group-by query
  const distrib_vega4 = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(AVG(lon)) as x, conv_4326_900913_y(AVG(lat)) as y, lang, COUNT(*) as cnt FROM tweets_nov_feb WHERE (lon >= -124.45312499999844 AND lon <= 124.4531249999988) AND (lat >= -78.25512538897416 AND lat <= 84.99999999999986) GROUP BY lang"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -16050037.645163452,
          16050037.645163476
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.87803981,
          19971868.877908602
        ],
        "range": "height"
      },
      {
        "name": "pointmap_size",
        "type": "threshold",
        "domain": [500, 5000, 25000, 85000],
        "range": [3, 8, 15, 25, 40]
      },
      {
        "name": "pointmap_fillColor",
        "type": "ordinal",
        "domain": ["en", "es"],
        "range": [
          "red", "blue"
        ],
        "default": "gray",
        "nullValue": "gray"
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
            "field": "lang"
          },
          "size": {
            "scale": "pointmap_size",
            "field": "cnt"
          }
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
      let results = con.renderVega(1, JSON.stringify(distrib_vega))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("distributedAggQueryTest", "distributedAggQueryTest")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
