document.addEventListener("DOMContentLoaded", () => {

  // DECIMAL

  // with the airplanes_20161214 table, the Speed & TrackAngle columns are decimal
  // DECIMAL(12,3) to be exact
  const airplanes_speed_live_stats = {
      "width": 1359,
      "height": 895,
      "data": [
        {
          "name": "pointmap",
          "sql": "SELECT conv_4326_900913_x(Lon) as x, conv_4326_900913_y(Lat) as y, Speed as color, TrackAngle as size, airplanes_20161214.rowid FROM airplanes_20161214 WHERE MOD(airplanes_20161214.rowid * 265445761, 4294967296) < 292525826 AND ((Lon >= -124.38999999999945 AND Lon <= -66.9400000000007) AND (Lat >= 22.33928769805452 AND Lat <= 51.800212016720224)) LIMIT 2000000"
        },
        {
          "name": "pointmap_stats",
          "source": "pointmap",
          "transform": [
            {
              "type": "aggregate",
              "fields": [ "color", "color", "color", "color", "size", "size", "size", "size" ],
              "ops": [ "min", "max", "avg", "stddev", "min", "max", "avg", "stddev" ],
              "as": [ "mincol", "maxcol", "avgcol", "stdcol", "minsz", "maxsz", "avgsz", "stdsz" ]
            },
            {
              "type": "formula",
              "expr": "max(mincol, avgcol-2*stdcol)",
              "as": "mincolor"
            },
            {
              "type": "formula",
              "expr": "min(maxcol, avgcol+2*stdcol)",
              "as": "maxcolor"
            },
            {
              "type": "formula",
              "expr": "max(minsz, avgsz-2*stdsz)",
              "as": "minsize"
            },
            {
              "type": "formula",
              "expr": "min(maxsz, avgsz+2*stdsz)",
              "as": "maxsize"
            }
          ]
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [ -13847031.45787536, -7451726.712679397 ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [ 2552309.8200721354, 6764081.524974389 ],
          "range": "height"
        },
        {
          "name": "pointmap_fillColor",
          "type": "quantize",
          "domain": { "data": "pointmap_stats", "fields": [ "mincolor", "maxcolor" ] },
          "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
        },
        {
          "name": "pointmap_size",
          "type": "quantize",
          "domain": { "data": "pointmap_stats", "fields": [ "minsize", "maxsize" ] },
          "range": [ 1, 2, 4, 8, 14, 20 ]
        }
      ],
      "projections": [],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "pointmap"
          },
          "properties": {
            "xc": { "scale": "x", "field": "x" },
            "yc": { "scale": "y", "field": "y" },
            "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
            "shape": "circle",
            "width": { "scale": "pointmap_size", "field": "size" },
            "height": { "scale": "pointmap_size", "field": "size" },
          }
        }
      ]
    }

  // with the airplanes_20161214 table, the Speed & TrackAngle columns are decimal
  // DECIMAL(12,3) to be exact
  const airplanes_speed_baked_stats = {
      "width": 1359,
      "height": 895,
      "data": [
        {
          "name": "pointmap",
          "sql": "SELECT conv_4326_900913_x(Lon) as x, conv_4326_900913_y(Lat) as y, Speed as color, TrackAngle as size, airplanes_20161214.rowid FROM airplanes_20161214 WHERE MOD(airplanes_20161214.rowid * 265445761, 4294967296) < 292525826 AND ((Lon >= -124.38999999999945 AND Lon <= -66.9400000000007) AND (Lat >= 22.33928769805452 AND Lat <= 51.800212016720224)) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [ -13847031.45787536, -7451726.712679397 ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [ 2552309.8200721354, 6764081.524974389 ],
          "range": "height"
        },
        {
          "name": "pointmap_fillColor",
          "type": "quantize",
          "domain": [0, 669.5757639795929],
          "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
        },
        {
          "name": "pointmap_size",
          "type": "quantize",
          "domain": [0, 388.7222837080625],
          "range": [ 1, 2, 4, 8, 14, 20 ]
        }
      ],
      "projections": [],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "pointmap"
          },
          "properties": {
            "xc": { "scale": "x", "field": "x" },
            "yc": { "scale": "y", "field": "y" },
            "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
            "shape": "circle",
            "width": { "scale": "pointmap_size", "field": "size" },
            "height": { "scale": "pointmap_size", "field": "size" }
          }
        }
      ]
    }

  // with the nba table, the original_x/y & converted_x/y columns are DECIMAL(14,7)
  const nba_live_stats_symbol = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199) AND  MOD(nba.rowid * 265445761, 4294967296) < 3129332999 LIMIT 2000000"
      },
      {
        "name": "point_stats",
        "source": "points",
        "transform": [
          {
            "type": "aggregate",
            "fields": [ "x", "x", "x", "x" ],
            "ops": [ "min", "max", "avg", "stddev" ],
            "as": [ "minx", "maxx", "avgx", "stdx" ]
          },
          {
            "type": "formula",
            "expr": "max(minx, avgx-2*stdx)",
            "as": "minimumx"
          },
          {
            "type": "formula",
            "expr": "min(maxx, avgx+2*stdx)",
            "as": "maximumx"
          }
        ]
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
        "name": "points_fillColor",
        "type": "quantize",
        "domain": {"data": "point_stats", "fields": ["minimumx", "maximumx"]},
        "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
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
          "width": 4,
          "height": 4,
          "fillColor": { "scale": "points_fillColor", "field": "x" }
        }
      }
    ]
  }

  const nba_baked_stats_symbol = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199) AND  MOD(nba.rowid * 265445761, 4294967296) < 3129332999 LIMIT 2000000"
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
        "name": "points_fillColor",
        "type": "quantize",
        "domain": [-222.5845952905298, 222.243702258929],
        "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
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
          "width": 4,
          "height": 4,
          "fillColor": { "scale": "points_fillColor", "field": "x" }
        }
      }
    ]
  }

  const nba_baked_stats_points = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199) AND  MOD(nba.rowid * 265445761, 4294967296) < 3129332999 LIMIT 2000000"
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
        "name": "points_fillColor",
        "type": "quantize",
        "domain": [-222.5845952905298, 222.243702258929],
        "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "points"
        },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "size": 4,
          "fillColor": { "scale": "points_fillColor", "field": "x" }
        }
      }
    ]
  }

  const nba_quantile_stats_symbol = {
      "width": 295,
      "height": 607,
      "data": [
        {
          "name": "points",
          "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199) AND  MOD(nba.rowid * 265445761, 4294967296) < 3129332999 LIMIT 2000000"
        },
        {
          "name": "points_stats",
          "source": "points",
          "transform": [
            {
              "type": "aggregate",
              "fields": ["x"],
              "ops":    [{type: "quantile", numQuantiles: 6}],
              "as":     ["quantx"]
            }
          ]
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
          "name": "points_fillColor",
          "type": "threshold",
          "domain": {"data": "points_stats", "fields": ["quantx"]},
          "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
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
            "width": 4,
            "height": 4,
            "fillColor": { "scale": "points_fillColor", "field": "x" }
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
      let results = con.renderVega(1, JSON.stringify(airplanes_speed_live_stats))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("typesTest", "typesTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(airplanes_speed_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(nba_live_stats_symbol))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(nba_baked_stats_symbol))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(nba_baked_stats_points))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(nba_quantile_stats_symbol))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
