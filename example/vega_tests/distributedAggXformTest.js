document.addEventListener("DOMContentLoaded", () => {
  const distrib_vega_baked_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
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
        "domain": [0, 48072.27990949663],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [0, 48072.27990949663],
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

  const distrib_vega_live_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
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

  const distrib_vega2_baked_stats = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -124.38999999999976 AND lon <= -66.94000000000037) AND (lat >= 6.089823193983378 AND lat <= 61.04948827377143)) ORDER BY rowid LIMIT 2000000"
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
        "domain": [0, 76651.66678436227],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [0, 76651.66678436227],
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

  const distrib_vega2_live_stats = {
    "width": 708,
    "height": 881,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -124.38999999999976 AND lon <= -66.94000000000037) AND (lat >= 6.089823193983378 AND lat <= 61.04948827377143)) ORDER BY rowid LIMIT 2000000"
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
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
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
          3434.2270480613415
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
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
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

  const multilayer_baked_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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
        "domain": [1, 3434.2270480613415],
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
        "domain": [0, 48087.89744587218],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": [0, 48087.89744587218],
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

  const multilayer_live_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
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
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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

  const multilayer_baked_stats2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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
        "domain": [0, 8677.103404659094],
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
        "domain": [0, 48087.89744587218],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": [0, 48087.89744587218],
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
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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

  const multilayer_baked_mixed_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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
        "domain": [0, 48087.89744587218],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": [0, 48087.89744587218],
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

  const multilayer_live_mixed_stats = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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

  const multilayer_baked_mixed_stats2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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
        "domain": [0, 8677.103404659094],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": [0, 8677.103404659094],
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

  const multilayer_live_mixed_stats2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, AVG(followers) as color FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) LIMIT 2000000"
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
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
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
        "domain": [0, 48072.27990949663],
        "range": [
          1, 20
        ],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": ["pt", "es", "in", "th", "en", "fr", "it", "und", "tl", "ja", "ar", "ko", "tr", "ru", "pl", "cy", "is", "zh", "vi", "no", "lv", "ht", "lt", "sl", "fi", "sv", "de", "nl", "uk", "bs", "et", "sk", "hi", "bg", "da", "el", "iw", "fa", "hu", "ta", "ro", "ur", "bn", "hr", "ne", "sr", "kn", "hy", "lo", "ml", "am", "si", "ka", "my", "km"],
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
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,lang,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
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

  const vega_baked_median_heatmap_stats = {
    "width": 725,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-14098832.427368894,-7406617.727863016,conv_4326_900913_y(lat),436809.69610634266,8532081.822285643,9.931506849315069,11.467916305821335,0,0,725,877) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-14098832.427368894,-7406617.727863016,conv_4326_900913_y(lat),436809.69610634266,8532081.822285643,9.931506849315069,11.467916305821335,0,0,725,877) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -126.65196659483136 AND lon <= -66.53477909482838) AND (lat >= 3.9208644815217326 AND lat <= 60.58911342244116)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -14098832.427368894,
          -7406617.727863016
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          436809.69610634266,
          8532081.822285643
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "threshold",
        "domain": [11],
        "range": [
          "blue", "red"
        ]
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
          "width": 9.931506849315069,
          "height": 11.467916305821335,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const vega_live_median_heatmap_stats = {
    "width": 725,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-14098832.427368894,-7406617.727863016,conv_4326_900913_y(lat),436809.69610634266,8532081.822285643,9.931506849315069,11.467916305821335,0,0,725,877) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-14098832.427368894,-7406617.727863016,conv_4326_900913_y(lat),436809.69610634266,8532081.822285643,9.931506849315069,11.467916305821335,0,0,725,877) as y, count(*) as color FROM tweets_nov_feb WHERE ((lon >= -126.65196659483136 AND lon <= -66.53477909482838) AND (lat >= 3.9208644815217326 AND lat <= 60.58911342244116)) GROUP BY x, y"
      },
      {
        "name": "heatmap_statistics",
        "source": "heatmap_query",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["color"],
            "ops":    ["median"],
            "as":     ["mediancolor"]
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -14098832.427368894,
          -7406617.727863016
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          436809.69610634266,
          8532081.822285643
        ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "threshold",
        "domain": {"data": "heatmap_statistics", "field": "mediancolor"},
        "range": [
          "blue", "red"
        ]
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
          "width": 9.931506849315069,
          "height": 11.467916305821335,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const vega_baked_median_pointmap_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
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
        "name": "color",
        "type": "threshold",
        "domain": [-943213.3950024331],
        "range": [
          "blue", "red"
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
            "field": "x"
          },
          "size": 5
        }
      }
    ]
  }

  const vega_live_median_pointmap_stats = {
    "height": 817,
    "width": 734,
    "data": [
      {
        "name": "table",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb WHERE (lon >= -160.58883892242582 AND lon < 161.778841363832) AND (lat >= -85.00000000000036 AND lat < 85.0000000000004) LIMIT 2000000"
      },
      {
        "name": "xformtable",
        "source": "table",
        "transform": [
          {
            "type": "aggregate",
            "fields": ["x"],
            "ops":    ["median"],
            "as":     ["medianx"]
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
        "name": "color",
        "type": "threshold",
        "domain": {"data": "xformtable", "field": "medianx"},
        "range": [
          "blue", "red"
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
            "field": "x"
          },
          "size": 5
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
      const w = window.open("distributedAggXformTest", "distributedAggXformTest")

      let results = con.renderVega(1, JSON.stringify(distrib_vega_baked_stats))
      let blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(heatmap_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(heatmap_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega2_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(distrib_vega2_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_baked_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_baked_stats2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_stats2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_baked_mixed_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_live_mixed_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multilayer_baked_mixed_stats2))
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

      results = con.renderVega(1, JSON.stringify(vega_baked_median_heatmap_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_live_median_heatmap_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_baked_median_pointmap_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(vega_live_median_pointmap_stats))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
