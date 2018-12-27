document.addEventListener("DOMContentLoaded", () => {
  const vega_baked_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": [0, 41983.83346796882],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [0, 41983.83346796882],
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "followers"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_live_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      },
      {
        "name": "xformtable",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "followers"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega2_baked_stats = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -124.38999999999976 AND lon <= -66.94000000000037) AND (lat >= 6.089823193983378 AND lat <= 61.04948827377143)) LIMIT 2000000"
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
      },
      {
        "name": "size",
        "type": "linear",
        "domain": [-1, 39820.52750716202],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [-1, 39820.52750716202],
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "followers"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega2_live_stats = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -124.38999999999976 AND lon <= -66.94000000000037) AND (lat >= 6.089823193983378 AND lat <= 61.04948827377143)) LIMIT 2000000"
      },
      {
        "name": "xformtable",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
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
      },
      {
        "name": "size",
        "type": "linear",
        "domain": {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "followers"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const heatmap_baked_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [
          1,
          180759.03667167752
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
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const heatmap_live_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "xformtable",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["mincol", "maxcol", "avgcol", "stdcol"]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": {"data": "xformtable", "fields": ["mincoltouse", "maxcoltouse"]},
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
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const multilayer_live_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "xformheat",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["mincol", "maxcol", "avgcol", "stdcol"]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcoltouse"
          }
        ]
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
      },
      {
        "name": "xformpoint",
        "source": "pointmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": {"data": "xformheat", "fields": ["mincoltouse", "maxcoltouse"]},
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
        "default": "#0d0887",
        "nullValue": "#0d0887"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      },
      {
        "type": "points",
        "from": {
          "data": "pointmap_query"
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
            "scale": "point_color",
            "field": "followers"
          },
          "size": {
            "scale": "point_size",
            "field": "followers"
          }
        }
      }
    ]
  }


  const multilayer_live_stats2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
      },
      {
        "name": "xformheat",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["mincol", "maxcol", "avgcol", "stdcol"]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcoltouse"
          }
        ]
      },
      {
        "name": "xformpoint",
        "source": "pointmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": {"data": "xformheat", "fields": ["mincoltouse", "maxcoltouse"]},
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
        "default": "#0d0887",
        "nullValue": "#0d0887"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      },
      {
        "type": "points",
        "from": {
          "data": "pointmap_query"
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
            "scale": "point_color",
            "field": "followers"
          },
          "size": {
            "scale": "point_size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const multilayer_live_mixed_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
      },
      {
        "name": "xformheat",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["mincol", "maxcol", "avgcol", "stdcol"]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcoltouse"
          }
        ]
      },
      {
        "name": "xformpoint",
        "source": "pointmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": {"data": "xformpoint", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "all_color",
            "field": "color"
          }
        }
      },
      {
        "type": "points",
        "from": {
          "data": "pointmap_query"
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
            "scale": "all_color",
            "field": "followers"
          },
          "size": {
            "scale": "point_size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const multilayer_live_mixed_stats2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
      },
      {
        "name": "xformheat",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min", "max", "avg", "stddev"],
            "as":     ["mincol", "maxcol", "avgcol", "stdcol"]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17552387.676773123,
          17552387.676773123
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -9156868.024211522,
          16163967.710328406
        ],
        "range": "height"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": {"data": "xformheat", "fields": ["mincoltouse", "maxcoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": {"data": "xformheat", "fields": ["mincoltouse", "maxcoltouse"]},
        "range": [
          "rgb(0,0,255)", "rgb(255,0,0)"
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "pointmap_query"
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
            "scale": "all_color",
            "field": "followers"
          },
          "size": {
            "scale": "point_size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_baked_distinct_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": [0, 41983.83346796882],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": ["pt", "en", "und", "ru", "es", "ar", "in", "sl", "tl", "et", "fr", "ht", "th", "cy", "ja", "tr", "ko", "no", "uk", "vi", "bs", "it", "sv", "sk", "hr", "de", "lv", "ro", "nl", "fi", "lt", "zh", "iw", "hu", "pl", "el", "is", "bg", "da", "hi", "fa", "ta", "ur", "ne", "kn", "sr", "si", "lo", "bn", "my", "ka", "km", "am", "ml", "hy", "pa", "te", "iu", "gu", "ps", "chr"],
        "range": [
          "blue", "red", "green", "yellow", "magenta", "purple", "teal"
        ]
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "lang"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_live_distinct_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      },
      {
        "name": "xformtable",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["followers", "followers", "followers", "followers", "lang"],
            "ops":    ["min", "max", "avg", "stddev", "distinct"],
            "as":     ["minfol", "maxfol", "avgfol", "stdfol", "distinctlang"]
          },
          {
            "type": "formula",
            "expr": "max(minfol, avgfol-2*stdfol)",
            "as": "minfoltouse"
          },
          {
            "type": "formula",
            "expr": "min(maxfol, avgfol+2*stdfol)",
            "as": "maxfoltouse"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]},
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": {"data": "xformtable", "field": "distinctlang"},
        "range": [
          "blue", "red", "green", "yellow", "magenta", "purple", "teal"
        ]
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "lang"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_baked_topk_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": [0, 41983.83346796882],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": ["en", "es", "pt", "in", "und"],
        "range": [
          "red", "green", "blue", "cyan", "magenta"
        ],
        "default": "yellow"
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "lang"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_live_topk_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb_60M WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      },
      {
        "name": "xformtable",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["lang"],
            "ops":    ["topk"],
            "as":     ["topkx"]
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -17876667.773475,
          18009138.239277
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -19971868.878041,
          19971868.877909
        ],
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "domain": [0, 41983.83346796882],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": {"data": "xformtable", "field": "topkx"},
        "range": [
          "red", "green", "blue", "cyan", "magenta"
        ],
        "default": "yellow"
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
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
            "scale": "color",
            "field": "lang"
          },
          "size": {
            "scale": "size",
            "field": "followers"
          }
        }
      }
    ]
  }

  const vega_poly_baked_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "linear",
        "domain": [1, 6386.421462105914],
        "range": [
          "#115f9a",
          "#d0f400"
        ],
        "default": "green",
        "nullValue": "#CACACA",
        "clamp": false
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_poly_live_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      },
      {
        "name": "stats",
        "source": "choroplethLayer0",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color", "color", "color", "color"],
            "ops":    ["min",   "max", "avg", "stddev"],
            "as":     ["minval","maxval","avgval", "stddevval"]
          },
          {
            "type": "formula",
            "as": "startval",
            "expr": "max(minval, avgval-2*stddevval)"
          },
          {
            "type": "formula",
            "as": "endval",
            "expr": "min(maxval, avgval+2*stddevval)"
          }
        ]
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "linear",
        "domain": {"data": "stats", "fields": ["startval", "endval"]},
        "range": [
          "#115f9a",
          "#d0f400"
        ],
        "default": "green",
        "nullValue": "#CACACA",
        "clamp": false
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_poly_baked_median_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": [83],
        "range": [
          "#115f9a",
          "#d0f400"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_poly_live_median_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      },
      {
        "name": "stats",
        "source": "choroplethLayer0",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color"],
            "ops":    ["median"],
            "as":     ["medianval"]
          }
        ]
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": {"data": "stats", "fields": ["medianval"]},
        "range": [
          "#115f9a",
          "#d0f400"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_poly_baked_quantile_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": [6, 17, 37, 83, 191, 464, 1273.25],
        "range": [
          "rgb(0,0,255)",
          "rgb(36,0,219)",
          "rgb(72,0,183)",
          "rgb(108,0,147)",
          "rgb(147,0,108)",
          "rgb(183,0,72)",
          "rgb(219,0,36)",
          "rgb(255,0,0)"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_poly_live_quantile_stats = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      },
      {
        "name": "stats",
        "source": "choroplethLayer0",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color"],
            "ops":    [{"type": "quantile", "numQuantiles": 8}],
            "as":     ["quantileval"]
          }
        ]
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -13902412.502438568,
          -7191838.923040948
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          2287112.396102004,
          6984513.901690078
        ],
        "range": "height"
      },
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": {"data": "stats", "field": "quantileval"},
        "range": [
          "rgb(0,0,255)",
          "rgb(36,0,219)",
          "rgb(72,0,183)",
          "rgb(108,0,147)",
          "rgb(147,0,108)",
          "rgb(183,0,72)",
          "rgb(219,0,36)",
          "rgb(255,0,0)"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const vega_empty_xform_data = {
    "width": 1367,
    "height": 606,
    "data": [
      {
        "name": "heatmap_queryheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-6530917.742201228,-6282233.08404109,conv_4326_900913_y(lat),4374835.455183525,4485078.983234232,9.978102189781023,11.521719970543336,0,0,1367,606) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-6530917.742201228,-6282233.08404109,conv_4326_900913_y(lat),4374835.455183525,4485078.983234232,9.978102189781023,11.521719970543336,0,0,1367,606) as y, count(lang) as color FROM tweets_nov_feb_60M WHERE ((lon >= -58.71922901089208 AND lon <= -56.355921438536015) AND (lat >= 36.507063397754905 AND lat <= 37.34456933279846)) GROUP BY x, y"
      },
      {
        "name": "heatmap_queryheat_stats",
        "source": "heatmap_queryheat",
        "transform": [
          {
            "type": "aggregate",
            "fields": [ "color", "color", "color", "color" ],
            "ops": [ "min", "max", "avg", "stddev" ],
            "as": [ "minimum", "maximum", "mean", "deviation" ]
          },
          {
            "type": "formula",
            "expr": "max(minimum, mean-2*deviation)",
            "as": "mincolor"
          },
          {
            "type": "formula",
            "expr": "min(maximum, mean+2*deviation)",
            "as": "maxcolor"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -6530917.742201228, -6282233.08404109 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 4374835.455183525, 4485078.983234232 ],
        "range": "height"
      },
      {
        "name": "heat_colorsheat",
        "type": "quantize",
        "domain": {
          "data": "heatmap_queryheat_stats",
          "fields": [ "mincolor", "maxcolor" ]
        },
        "range": [
          "rgba(13,8,135,1)",
          "rgba(86,1,164,1)",
          "rgba(143,13,164,1)",
          "rgba(191,57,132,1)",
          "rgba(225,100,98,1)",
          "rgba(248,149,64,1)",
          "rgba(252,206,37,1)",
          "rgba(240,249,33,1)"
        ],
        "default": "rgba(13,8,135,1)",
        "nullValue": "rgba(13,8,135,1)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_queryheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.978102189781023,
          "height": 11.521719970543336,
          "fillColor": {
            "scale": "heat_colorsheat",
            "field": "color"
          }
        }
      }
    ]
  }

  // the gaia_sim_2_1 table has a column called health that is a smallint column and has a bunch of nulls
  // This tests proper aggregate data ignoring those nulls
  const vega_null_live_smallint_data = {
    "width": 831,
    "height": 652,
    "data": [
      {
        "name": "backendScatter",
        "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_1.rowid FROM gaia_sim_2_1 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884)) LIMIT 2000000"
      },
      {
        "name": "backendScatter_stats",
        "source": "backendScatter",
        "transform": [
          {
            "type": "aggregate",
            "fields": [ "color", "color", "color", "color" ],
            "ops": [ "min", "max", "avg", "stddev" ],
            "as": [ "mincol", "maxcol", "avgcol", "stdcol" ]
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
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -15.666223625560967, 108.97143254398324 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -11.655807332925363, 112.98184883661884 ],
        "range": "height"
      },
      {
        "name": "backendScatter_fillColor",
        "type": "quantize",
        "domain": { "data": "backendScatter_stats", "fields": [ "mincolor", "maxcolor" ] },
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "backendScatter"
        },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
          "size": 4
        }
      }
    ]
  }

  const vega_null_baked_smallint_data = {
    "width": 831,
    "height": 652,
    "data": [
      {
        "name": "backendScatter",
        "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_1.rowid FROM gaia_sim_2_1 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884)) LIMIT 2000000"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -15.666223625560967, 108.97143254398324 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -11.655807332925363, 112.98184883661884 ],
        "range": "height"
      },
      {
        "name": "backendScatter_fillColor",
        "type": "quantize",
        "domain": [60.31079265296532, 100],
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "points",
        "from": { "data": "backendScatter" },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
          "size": 4
        }
      }
    ]
  }

  // the gaia_sim_2_2 table has a column called health that is a float column and has a bunch of nulls
  // This tests proper aggregate data ignoring those nulls
  const vega_null_live_float_data = {
      "width": 831,
      "height": 652,
      "data": [
        {
          "name": "backendScatter",
          "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_2.rowid FROM gaia_sim_2_2 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884)) LIMIT 2000000"
        },
        {
          "name": "backendScatter_stats",
          "source": "backendScatter",
          "transform": [
            {
              "type": "aggregate",
              "fields": [ "color", "color", "color", "color" ],
              "ops": [ "min", "max", "avg", "stddev" ],
              "as": [ "mincol", "maxcol", "avgcol", "stdcol" ]
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
            }
          ]
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [ -15.666223625560967, 108.97143254398324 ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [ -11.655807332925363, 112.98184883661884 ],
          "range": "height"
        },
        {
          "name": "backendScatter_fillColor",
          "type": "quantize",
          "domain": [60.31079265296532, 100],
          "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
        }
      ],
      "projections": [],
      "marks": [
        {
          "type": "points",
          "from": {
            "data": "backendScatter"
          },
          "properties": {
            "x": { "scale": "x", "field": "x" },
            "y": { "scale": "y", "field": "y" },
            "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
            "size": 4
          }
        }
      ]
    }

    const vega_null_baked_float_data = {
      "width": 831,
      "height": 652,
      "data": [
        {
          "name": "backendScatter",
          "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_2.rowid FROM gaia_sim_2_2 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884)) LIMIT 2000000"
        },
        {
          "name": "backendScatter_stats",
          "source": "backendScatter",
          "transform": [
            {
              "type": "aggregate",
              "fields": [ "color", "color", "color", "color" ],
              "ops": [ "min", "max", "avg", "stddev" ],
              "as": [ "mincol", "maxcol", "avgcol", "stdcol" ]
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
            }
          ]
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [ -15.666223625560967, 108.97143254398324 ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [ -11.655807332925363, 112.98184883661884 ],
          "range": "height"
        },
        {
          "name": "backendScatter_fillColor",
          "type": "quantize",
          "domain": { "data": "backendScatter_stats", "fields": [ "mincolor", "maxcolor" ] },
          "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
        }
      ],
      "projections": [],
      "marks": [
        {
          "type": "points",
          "from": {
            "data": "backendScatter"
          },
          "properties": {
            "x": { "scale": "x", "field": "x" },
            "y": { "scale": "y", "field": "y" },
            "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
            "size": 4
          }
        }
      ]
    }

    const vega_tinyint_test = {
      "width": 793,
      "height": 502,
      "data": [
        {
          "name": "pointmap",
          "sql": "SELECT ST_X(dropoff_point) as x, ST_Y(dropoff_point) as y, cab_type_id as color, rowid FROM taxi_factual_closestbuilding WHERE MOD(rowid * 265445761, 4294967296) < 48373727 AND ((ST_X(dropoff_point) >= -74.23873554769207 AND ST_X(dropoff_point) <= -73.29965110742263) AND (ST_Y(dropoff_point) >= 40.55116668287144 AND ST_Y(dropoff_point) <= 41.00134102538428)) LIMIT 2000000"
        },
        {
          "name": "pointmap_stats",
          "source": "pointmap",
          "transform": [
            {
              "type": "aggregate",
              "fields": [ "color", "color", "color", "color" ],
              "ops": [ "min", "max", "avg", "stddev" ],
              "as": [ "mincol", "maxcol", "avgcol", "stdcol" ]
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
            }
          ]
        }
      ],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [-74.23873554769207, -73.29965110742263],
            "y": [40.55116668287144, 41.00134102538428]
          }
        }
      ],
      "scales": [
        {
          "name": "pointmap_fillColor",
          "type": "quantize",
          "domain": {
            "data": "pointmap_stats",
            "fields": [ "mincolor", "maxcolor" ]
          },
          "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "pointmap"
          },
          "properties": {
            "xc": { "field": "x" },
            "yc": { "field": "y" },
            "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
            "shape": "circle",
            "width": 1,
            "height": 1
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        }
      ]
    }

    // Tests empty data, but buffers have data (from invalidkeys), should properly create an empty image without
    // error and with nulls in the scale domain metadata
    const vega_empty_xform_with_invalidkeys = {
      "width": 716,
      "height": 352,
      "data": [
        {
          "name": "backendScatter",
          "sql": "SELECT dropoff_y as x, dropoff_x as y, extra as size, mta_tax as color, nyc_yellow_taxi_2014.rowid FROM nyc_yellow_taxi_2014 WHERE ((nyc_yellow_taxi_2014.dropoff_x >= -8227853.667385602 AND nyc_yellow_taxi_2014.dropoff_x <= -8226214.25584072) AND (nyc_yellow_taxi_2014.dropoff_y >= 4978689.731019676 AND nyc_yellow_taxi_2014.dropoff_y <= 4979529.601558646) AND (nyc_yellow_taxi_2014.dropoff_y >= -8227853.667385602 AND nyc_yellow_taxi_2014.dropoff_y <= -8226214.25584072) AND (nyc_yellow_taxi_2014.dropoff_x >= 4978689.731019676 AND nyc_yellow_taxi_2014.dropoff_x <= 4979529.601558646)) LIMIT 2000000"
        },
        {
          "name": "backendScatter_stats",
          "source": "backendScatter",
          "transform": [
            {
              "type": "aggregate",
              "fields": [
                "color",
                "color",
                "color",
                "color"
              ],
              "ops": [
                "min",
                "max",
                "avg",
                "stddev"
              ],
              "as": [
                "mincol",
                "maxcol",
                "avgcol",
                "stdcol"
              ]
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
            }
          ]
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -8227853.667385602,
            -8226214.25584072
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            4978689.731019676,
            4979529.601558646
          ],
          "range": "height"
        },
        {
          "name": "backendScatter_size",
          "type": "linear",
          "domain": [
            0,
            628.8699951171875
          ],
          "range": [
            3,
            10
          ],
          "clamp": true
        },
        {
          "name": "backendScatter_fillColor",
          "type": "quantize",
          "domain": {
            "data": "backendScatter_stats",
            "fields": [
              "mincolor",
              "maxcolor"
            ]
          },
          "range": [
            "rgba(17,95,154,0.85)",
            "rgba(25,132,197,0.85)",
            "rgba(34,167,240,0.85)",
            "rgba(72,181,196,0.85)",
            "rgba(118,198,143,0.85)",
            "rgba(166,215,91,0.85)",
            "rgba(201,229,47,0.85)",
            "rgba(208,238,17,0.85)",
            "rgba(208,244,0,0.85)"
          ]
        }
      ],
      "projections": [],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "backendScatter"
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
              "scale": "backendScatter_fillColor",
              "field": "color"
            },
            "shape": "circle",
            "width": {
              "scale": "backendScatter_size",
              "field": "size"
            },
            "height": {
              "scale": "backendScatter_size",
              "field": "size"
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
      let results = con.renderVega(1, JSON.stringify(vega_baked_stats))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("xformUpdateTest", "xformUpdateTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(heatmap_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(heatmap_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega2_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega2_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_stats2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_mixed_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_mixed_stats2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_baked_distinct_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_live_distinct_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // results = con.renderVega(1, JSON.stringify(vega_baked_topk_stats))
      // blobUrl = "data:image/png;base64," + results.image
      // w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // results = con.renderVega(1, JSON.stringify(vega_live_topk_stats))
      // blobUrl = "data:image/png;base64," + results.image
      // w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_baked_median_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_live_median_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_baked_quantile_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_poly_live_quantile_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_empty_xform_data))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_null_live_smallint_data))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_null_baked_smallint_data))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_null_live_float_data))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_null_baked_float_data))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_tinyint_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_empty_xform_with_invalidkeys))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
