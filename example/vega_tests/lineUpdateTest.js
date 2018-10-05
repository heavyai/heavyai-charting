document.addEventListener("DOMContentLoaded", () => {
  const line_update1 = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(origin_lon) as x1, conv_4326_900913_y(origin_lat) as y1, conv_4326_900913_x(dest_lon) as x2, conv_4326_900913_y(dest_lat) as y2, flights.rowid FROM flights WHERE ((origin_lon >= -124.38999999999976 AND origin_lon <= -66.94000000000037) AND (origin_lat >= 6.089823193983378 AND origin_lat <= 61.04948827377143)) OR ((dest_lon >= -124.38999999999976 AND dest_lon <= -66.94000000000037) AND (dest_lat >= 6.089823193983378 AND dest_lat <= 61.04948827377143)) LIMIT 200",
        "format": {
          "type": "lines",
          "coords": {
            "x": ["x1", "x2"],
            "y": ["y1", "y2"]
          },
          "layout": "interleaved"
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13847031.457875393,
          -7451726.712679361
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          679196.0393832333,
          8637195.305669934
        ],
        "range": "height"
      }
    ],
    "marks": [
      {
        "type": "lines",
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
          "strokeColor": "red",
          "strokeWidth": 2
        }
      }
    ]
  }

  // The query in the following generates an empty result set. This should be handled without error
  // and generate a blank image.
  const empty_line_query = {
    "width": 1183,
    "height": 1059,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(origin_lon) as x1, conv_4326_900913_y(origin_lat) as y1, conv_4326_900913_x(dest_lon) as x2, conv_4326_900913_y(dest_lat) as y2, flights.rowid FROM flights WHERE ((origin_lon >= -102.46276902850396 AND origin_lon <= -87.15069998423348) AND (origin_lat >= 12.373119922896137 AND origin_lat <= 25.311606413390578)) OR ((dest_lon >= -102.46276902850396 AND dest_lon <= -87.15069998423348) AND (dest_lat >= 12.373119922896137 AND dest_lat <= 25.311606413390578)) LIMIT 200",
        "format": {
          "type": "lines",
          "coords": {"x": ["x1","x2"],"y": ["y1","y2"]},
          "layout": "interleaved"
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [-11406103.271934122,-9701571.543171758],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [1388201.5731146329,2914067.254229401],
        "range": "height"
      }
    ],
    "marks": [
      {
        "type": "lines",
        "from": {"data": "pointmap"},
        "properties": {
          "x": {"scale": "x","field": "x"},
          "y": {"scale": "y","field": "y"},
          "strokeColor": "red",
          "strokeWidth": 2
        }
      }
    ]
  }

  const empty_line_query2 = {
    "width": 800,
    "height":464,
    "data":[
       {
          "name":"linemap",
          "format":{
             "type":"lines",
             "coords":{
                "x":[
                   "mapd_geo"
                ],
                "y":[
                   {
                      "from":"mapd_geo"
                   }
                ]
             },
             "layout":"interleaved"
          },
          "sql":"SELECT c5_LENGTH as strokeColor, uyanga_fault_lines.rowid as rowid, uyanga_fault_lines.mapd_geo FROM uyanga_fault_lines WHERE ((ST_Contains(ST_GeomFromText('POLYGON((-119.84215393903816 38.746369630070205, -119.82452866023397 38.746369630070205, -119.82452866023397 38.75434208555501, -119.84215393903816 38.75434208555501, -119.84215393903816 38.746369630070205))'), uyanga_fault_lines.mapd_geo)))"
       },
       {
          "name":"linemap_stats",
          "source":"linemap",
          "transform":[
             {
                "type":"aggregate",
                "fields":[
                   "strokeColor",
                   "strokeColor",
                   "strokeColor",
                   "strokeColor"
                ],
                "ops":[
                   "min",
                   "max",
                   "avg",
                   "stddev"
                ],
                "as":[
                   "mincol",
                   "maxcol",
                   "avgcol",
                   "stdcol"
                ]
             },
             {
                "type":"formula",
                "expr":"max(mincol, avgcol-2*stdcol)",
                "as":"mincolor"
             },
             {
                "type":"formula",
                "expr":"min(maxcol, avgcol+2*stdcol)",
                "as":"maxcolor"
             }
          ]
       }
    ],
    "scales":[
       {
          "name":"linemap_strokeColor",
          "type":"quantize",
          "domain":{
             "data":"linemap_stats",
             "fields":[
                "mincolor",
                "maxcolor"
             ]
          },
          "range":[
             "#115f9a ",
             "#1984c5 ",
             "#22a7f0 ",
             "#48b5c4 ",
             "#76c68f ",
             "#a6d75b ",
             "#c9e52f ",
             "#d0ee11 ",
             "#d0f400 "
          ],
          "nullValue":"#CACACA "
       }
    ],
    "projections":[
       {
          "name":"mercator_map_projection",
          "type":"mercator",
          "bounds":{
             "x":[
                -119.84215393903816,
                -119.82452866023397
             ],
             "y":[
                38.746369630070205,
                38.75434208555501
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
             "opacity":0.85,
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

  const geo_linestring_query = {
    "width": 1162,
    "height": 1057,
    "data": [
      {
        "name": "geojson_test1",
        "sql": "select mapd_geo as points from north_america_rivers",
        "format": {
          "type": "lines",
          "coords": {"x": ["points"],"y": [{"from": "points"}]},
          "layout": "interleaved"
        }
      }
    ],
    "projections": [
      {
        "name": "projection",
        "type": "mercator",
        "bounds": {
          "x": [-178.82500199472938,-44.974481654147695],
          "y": [4.178734557738693,77.32978533636006]
        }
      }
    ],
    "marks": [
      {
        "type": "lines",
        "from": {"data": "geojson_test1"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "opacity": 1,
          "strokeColor": "red",
          "strokeWidth": 1
        },
        "transform": {"projection": "projection"}
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
      let results = con.renderVega(1, JSON.stringify(line_update1))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("lineUpdateTest", "lineUpdateTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(line_update1))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(empty_line_query))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(empty_line_query2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(geo_linestring_query))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
