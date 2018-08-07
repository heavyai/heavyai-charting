document.addEventListener("DOMContentLoaded", function init() {
  const query_update1 = {
    width: 800,
    height: 563,
    data: [
      {
        name: "pointmap",
        sql:
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, flights.rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) LIMIT 2000000"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [-19664143.90195494, 16210482.913587093],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [-6461910.016250611, 18784858.60540035],
        range: "height"
      },
      {
        name: "pointmap_fillColor",
        type: "linear",
        domain: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        range: [
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
        accumulator: "density",
        minDensityCnt: "-2ndStdDev",
        maxDensityCnt: "2ndStdDev",
        clamp: true
      }
    ],
    marks: [
      {
        type: "symbol",
        from: { data: "pointmap" },
        properties: {
          xc: { scale: "x", field: "x" },
          yc: { scale: "y", field: "y" },
          fillColor: {scale: "pointmap_fillColor", value: 0},
          shape: "circle",
          width: 8,
          height: 8
        }
      }
    ]
  }

  const query_update2 = {
    width: 800,
    height: 563,
    data: [
      {
        name: "pointmap",
        sql:
          "SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) GROUP BY key0"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [-19664143.90195494, 16210482.913587093],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [-6461910.016250611, 18784858.60540035],
        range: "height"
      },
      {
        name: "pointmap_fillColor",
        type: "linear",
        domain: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        range: [
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
        accumulator: "density",
        minDensityCnt: "-2ndStdDev",
        maxDensityCnt: "2ndStdDev",
        clamp: true
      }
    ],
    marks: [
      {
        type: "symbol",
        from: { data: "pointmap" },
        properties: {
          xc: { scale: "x", field: "x" },
          yc: { scale: "y", field: "y" },
          fillColor: { scale: "pointmap_fillColor", value: 0 },
          shape: "circle",
          width: 8,
          height: 8
        }
      }
    ]
  }

  const query_update3 = {
    width: 1123,
    height: 453,
    data: [
      {
        name: "pointmap",
        sql:
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, carrier_name as color, flights.rowid FROM flights WHERE MOD(flights.rowid * 265445761, 4294967296) < 1255552403 AND ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) LIMIT 2000000"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [-17667203.915913504, -4293699.094562396],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [2910406.3625567225, 8305061.4686019095],
        range: "height"
      },
      {
        name: "pointmap_fillColor",
        type: "ordinal",
        domain: [
          "Southwest Airlines",
          "American Airlines",
          "Skywest Airlines",
          "American Eagle Airlines",
          "US Airways",
          "Delta Air Lines",
          "United Air Lines",
          "Expressjet Airlines",
          "Northwest Airlines",
          "Continental Air Lines",
          "Other"
        ],
        range: [
          "rgba(234,85,69,0.85)",
          "rgba(189,207,50,0.85)",
          "rgba(179,61,198,0.85)",
          "rgba(239,155,32,0.85)",
          "rgba(135,188,69,0.85)",
          "rgba(244,106,155,0.85)",
          "rgba(172,229,199,0.85)",
          "rgba(237,225,91,0.85)",
          "rgba(131,109,197,0.85)",
          "rgba(134,216,127,0.85)",
          "rgba(39,174,239,0.85)"
        ],
        default: "rgba(39,174,239,0.85)",
        nullValue: "rgba(202,202,202,0.85)"
      }
    ],
    marks: [
      {
        type: "symbol",
        from: { data: "pointmap" },
        properties: {
          xc: { scale: "x", field: "x" },
          yc: { scale: "y", field: "y" },
          fillColor: { scale: "pointmap_fillColor", field: "color" },
          shape: "circle",
          width: 1,
          height: 1
        }
      }
    ]
  }

  const query_update4 = {
    width: 1123,
    height: 453,
    data: [
      {
        name: "pointmap",
        sql:
          "SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y, APPROX_COUNT_DISTINCT(carrier_name) as color FROM flights WHERE ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) GROUP BY key0"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [-17667203.915913504, -4293699.094562396],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [2910406.3625567225, 8305061.4686019095],
        range: "height"
      },
      {
        name: "pointmap_fillColor",
        type: "quantize",
        domain: [1, 17],
        range: [
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
        clamp: true
      }
    ],
    marks: [
      {
        type: "symbol",
        from: { data: "pointmap" },
        properties: {
          xc: { scale: "x", field: "x" },
          yc: { scale: "y", field: "y" },
          fillColor: { scale: "pointmap_fillColor", field: "color" },
          shape: "circle",
          width: 1,
          height: 1
        }
      }
    ]
  }

  const query_update5 = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(AVG(lon)) as x, conv_4326_900913_y(AVG(lat)) as y, lang, COUNT(*) as cnt FROM tweets_nov_feb_60M WHERE MOD(tweets_nov_feb_60M.rowid * 265445761, 4294967296) < 142134250 AND ((lon >= -124.45312499999844 AND lon <= 124.4531249999988) AND (lat >= -78.25512538897416 AND lat <= 84.99999999999986)) GROUP BY lang"
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
        "domain": [1000, 10000, 50000, 270000],
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

  const query_agg_with_ordinal = {
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

  const scatter_query_with_int2double_coerscion = {
    'width': 541,
    'height': 457,
    'data': [{
      'name': 'backendScatter',
      'sql': 'SELECT airtime as x, arrdelay as y, flights_123M.rowid FROM flights_123M WHERE ((airtime >= 146.8018680288236 AND airtime <= 1219.1102225617133) AND (arrdelay >= -303.2348777943914 AND arrdelay <= 2063.7865270263574)) LIMIT 2000000'
    }],
    'scales': [
      {
        'name': 'x',
        'type': 'linear',
        'domain': [146.8018680288236, 1219.1102225617133],
        'range': 'width'
      },
      {
        'name': 'y',
        'type': 'linear',
        'domain': [-303.2348777943914, 2063.7865270263574],
        'range': 'height'
      },
      {
        'name': 'backendScatter_fillColor',
        'type': 'linear',
        'domain': [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        'range': [
          'rgba(17,95,154,0.475)', 'rgba(25,132,197,0.5471153846153846)',
          'rgba(34,167,240,0.6192307692307691)',
          'rgba(72,181,196,0.6913461538461538)',
          'rgba(118,198,143,0.7634615384615384)',
          'rgba(166,215,91,0.835576923076923)', 'rgba(201,229,47,0.85)',
          'rgba(208,238,17,0.85)', 'rgba(208,244,0,0.85)'
        ],
        'accumulator': 'density',
        'minDensityCnt': '-2ndStdDev',
        'maxDensityCnt': '2ndStdDev',
        'clamp': true
      }
    ],
    'marks': [{
      'type': 'points',
      'from': {'data': 'backendScatter'},
      'properties': {
        'x': {'scale': 'x', 'field': 'x'},
        'y': {'scale': 'y', 'field': 'y'},
        'fillColor': {'scale': 'backendScatter_fillColor', 'value': 0},
        'size': 2
      }
    }]
  }

  new MapdCon()
    .protocol('http')
    .host('localhost')
    .port('1024')
    .dbName('mapd')
    .user('mapd')
    .password('HyperInteractive')
    .connect((error, con) => {
      if (error) {
        throw error
      }
      let results = con.renderVega(1, JSON.stringify(query_update1))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("queryUpdateTest1", "queryUpdateTest1 results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(query_update2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(query_update1))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(query_update1))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // Produces an empty image, but should not error
      results = con.renderVega(1, JSON.stringify(query_update3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // Produces an empty image, but should not error
      results = con.renderVega(1, JSON.stringify(query_update4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // Should properly render dict-encoded strings from a group-by query
      results = con.renderVega(1, JSON.stringify(query_update5))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // Should properly render using a dict-encoded column after a
      // group-by
      results = con.renderVega(1, JSON.stringify(query_agg_with_ordinal))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // Should properly render using a dict-encoded column after a
      // group-by
      results = con.renderVega(1, JSON.stringify(query_agg_with_ordinal))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // airtime/arrdelay columns are ints, but the x/y axes scales use
      // doubles as the domain, so the ints are coersced at render time
      // to doubles
      results = con.renderVega(1, JSON.stringify(scatter_query_with_int2double_coerscion))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
