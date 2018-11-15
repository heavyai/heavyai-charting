document.addEventListener("DOMContentLoaded", () => {

  const all_null_column_with_xforms = {
    "width":432,
    "height":256,
    "data":[
       {
          "name":"linemap",
          "format":{
             "type":"lines",
             "coords":{
                "x":[
                   "omnisci_geo"
                ],
                "y":[
                   {
                      "from":"omnisci_geo"
                   }
                ]
             },
             "layout":"interleaved"
          },
          "sql":"SELECT Ferry_Route.drawOrder as strokeColor, Ferry_Route.rowid as rowid, Ferry_Route.omnisci_geo FROM Ferry_Route WHERE ((ST_Intersects(ST_GeomFromText('POLYGON((-9.838404039411898 50.55533029518068, -2.310857889588476 50.55533029518068, -2.310857889588476 53.61604635210904, -9.838404039411898 53.61604635210904, -9.838404039411898 50.55533029518068))'), Ferry_Route.omnisci_geo)))"
       },
       {
          "name":"linemap_stats",
          "source":"linemap",
          "transform":[
             {
                "type":"aggregate",
                "fields":[
                   "strokeColor",
                   "strokeColor"
                ],
                "ops":[
                   "min",
                   "max"
                ],
                "as":[
                   "mincol",
                   "maxcol"
                ]
             }
          ]
       }
    ],
    "scales":[
       {
          "name":"x",
          "type":"linear",
          "domain":[
             -1095206.127735535,
             -257243.52352929395
          ],
          "range":"width"
       },
       {
          "name":"y",
          "type":"linear",
          "domain":[
             6572106.4749301355,
             7068676.907054114
          ],
          "range":"height"
       },
       {
          "name":"linemap_strokeColor",
          "type":"quantize",
          "domain":{
             "data":"linemap_stats",
             "fields":[
                "mincol",
                "maxcol"
             ]
          },
          "range":[
             "rgba(17,95,154,0.85)",
             "rgba(25,132,197,0.85)",
             "rgba(34,167,240,0.85)",
             "rgba(72,181,196,0.85)",
             "rgba(118,198,143,0.85)",
             "rgba(166,215,91,0.85)",
             "rgba(201,229,47,0.85)",
             "rgba(208,238,17,0.85)",
             "rgba(208,244,0,0.85)"
          ],
          "nullValue": "orange"
       }
    ],
    "projections":[
       {
          "name":"mercator_map_projection",
          "type":"mercator",
          "bounds":{
             "x":[
                -9.838404039411756,
                -2.3108578895883056
             ],
             "y":[
                50.72109682412818,
                53.46071666206578
             ]
          }
       }
    ],
    "marks":[
       {
          "type":"lines",
          "from":{
             "data":"linemap"
          },
          "properties":{
             "x":{
                "field":"x"
             },
             "y":{
                "field":"y"
             },
             "strokeColor":{
                "scale":"linemap_strokeColor",
                "field":"strokeColor"
             },
             "strokeWidth":3,
             "lineJoin":"miter",
             "miterLimit":10
          },
          "transform":{
             "projection":"mercator_map_projection"
          }
       }
    ]
  }

  // dict enc str null test, all results should be null and should be orange
  const dict_enc_str_ordinal_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, lat as y, location, rowid FROM tweets_2017_may WHERE location IS NULL LIMIT 2000"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "ordinal",
        "domain": ["United States", "London", "Brasil", "India"],
        "range": ["blue", "red", "green", "purple"],
        "nullValue": "orange",
        "default": "gray"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-127.79296874999972, 127.79296874999972],
          "y": [-80.09909104616133, 84.99998999999994]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "location"
          },
          "shape": "circle",
          "width": 20,
          "height": 20
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  // dict enc str null test, should not see any orange as no results will be NULL
  const dict_enc_str_ordinal_no_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, lat as y, location, rowid FROM tweets_2017_may WHERE location IS NOT NULL LIMIT 200000"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "ordinal",
        "domain": ["United States", "London", "Brasil", "India"],
        "range": ["blue", "red", "green", "purple"],
        "nullValue": "orange",
        "default": "gray"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-127.79296874999972, 127.79296874999972],
          "y": [-80.09909104616133, 84.99998999999994]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "location"
          },
          "shape": "circle",
          "width": 3,
          "height": 3
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  // uses a float column with nulls to test quantize scale with null values. should all be the same color
  // note that there are 60 rows with goog_x = NULL in tweets_2017_may
  // All rows with goog_x = NULL have the following lon/lat: 45, -90. So I'm forcing a lat of 0 for all rows
  const float_quantize_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, CAST(0 AS FLOAT) as y, goog_x, rowid FROM tweets_2017_may WHERE goog_x IS NULL"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "quantize",
        "domain": [-1.422371e+07, 1.422582e+07],
        "range": ["blue", "red", "green", "purple"],
        "nullValue": "orange",
        "default": "gray"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-127.79296874999972, 127.79296874999972],
          "y": [-80.09909104616133, 84.99998999999994]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "goog_x"
          },
          "shape": "circle",
          "width": 30,
          "height": 30
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const float_linear_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, CAST(0 AS FLOAT) as y, goog_x, rowid FROM tweets_2017_may WHERE goog_x IS NULL"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "linear",
        "domain": [-1422.01, 1422.01],
        "range": ["blue", "red"],
        "nullValue": "orange",
        "default": "gray",
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-127.79296874999972, 127.79296874999972],
          "y": [-80.09909104616133, 84.99998999999994]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "goog_x"
          },
          "shape": "circle",
          "width": 30,
          "height": 30
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const float_threshold_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT dropoff_longitude as x, dropoff_latitude as y, trip_distance, rowid FROM nyc_yellow_taxi WHERE ((dropoff_longitude >= -74.37554157678305 AND dropoff_longitude <= -73.56220902252635) AND (dropoff_latitude >= 40.350507703150384 AND dropoff_latitude <= 41.12106017464788) AND trip_distance IS NULL) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "threshold",
        "domain": [5, 20, 100],
        "range": ["red", "blue", "green", "purple"],
        "nullValue": "orange"
      }
    ],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [-74.37554157678305, -73.56220902252635],
          "y": [40.350507703150384, 41.12106017464788]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "trip_distance"
          },
          "shape": "circle",
          "width": 5,
          "height": 5
        },
        "transform": {
          "projection": "mercator_map_projection"
        }
      }
    ]
  }

  const smallint_ordinal_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT origin_lon as x, origin_lat as y, arrtime, rowid FROM flights WHERE (origin_lon >= -155.26115898121895 AND origin_lon <= -43.41368583668796) AND (origin_lat >= -17.49092816383127 AND origin_lat <= 76.45488043026936) AND arrtime IS NULL"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "ordinal",
        "domain": [1410, 1015, 1400, 1020],
        "range": ["red", "blue", "green", "purple"],
        "nullValue": "orange",
        "default": "gray"
      }
    ],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [-155.26115898121895, -43.41368583668796],
          "y": [-17.49092816383127, 76.45488043026936]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "arrtime"
          },
          "shape": "circle",
          "width": 20,
          "height": 20
        },
        "transform": {
          "projection": "mercator_map_projection"
        }
      }
    ]
  }

  const smallint_linear_null_test = {
    "width": 727,
    "height": 909,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT origin_lon as x, origin_lat as y, arrtime, rowid FROM flights WHERE (origin_lon >= -155.26115898121895 AND origin_lon <= -43.41368583668796) AND (origin_lat >= -17.49092816383127 AND origin_lat <= 76.45488043026936) AND arrtime IS NULL"
      }
    ],
    "scales": [
      {
        "name": "null_color",
        "type": "linear",
        "domain": [1, 2400],
        "range": ["red", "blue"],
        "nullValue": "orange",
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [-155.26115898121895, -43.41368583668796],
          "y": [-17.49092816383127, 76.45488043026936]
        }
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
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "fillColor": {
            "scale": "null_color",
            "field": "arrtime"
          },
          "shape": "circle",
          "width": 20,
          "height": 20
        },
        "transform": {
          "projection": "mercator_map_projection"
        }
      }
    ]
  }

  const decimal_quantize_null_test = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT (-367.239050286676 + (CAST(rowid AS FLOAT) / 599482.0) * (336.23512241134455 - -367.239050286676)) as x, (-159.0039062616728 + (1.0 - CAST(rowid AS FLOAT) / 599482.0) * (1157.8997450290199 - -159.0039062616728)) as y, original_x, rowid FROM nba WHERE original_y IS NULL"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -367.239050286676, 336.23512241134455 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -159.0039062616728, 1157.8997450290199 ],
        "range": "height"
      },
      {
        "name": "null_color",
        "type": "quantize",
        "domain": [ -367.239050286676, 336.23512241134455 ],
        "range": ["red", "blue", "green", "purple"],
        "nullValue": "orange"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "points"
        },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "width": 10,
          "height": 10,
          "fillColor": {
            "scale": "null_color",
            "field": "original_x"
          }
        }
      }
    ]
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
      let results = con.renderVega(1, JSON.stringify(all_null_column_with_xforms))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("nullTest", "nullTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(dict_enc_str_ordinal_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(dict_enc_str_ordinal_no_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(float_quantize_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(float_linear_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(float_threshold_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(smallint_ordinal_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(smallint_linear_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(decimal_quantize_null_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
