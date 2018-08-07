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

  const contributionPctAccumulation2 = {
    "width": 746,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, CASE recipient_party WHEN 'R' THEN 1 WHEN 'D' THEN 1 ELSE 0 END as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
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
        "pctCategory": 1
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

  const contributionBlendAccumulation = {
    "width": 746,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, CASE recipient_party WHEN 'R' THEN 1 WHEN 'D' THEN 1 ELSE 0 END as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
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
        "type": "ordinal",
        "domain": [0, 1],
        "range": ["blue", "red"],
        "accumulator": "blend"
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "heatmap_query"
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
          "size": 5,
          "fillColor": {
            "scale": "accum_fillColor",
            "field": "color"
          }
        }
      }
    ]
  }

  const contributionDensityAccumulations = [
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
            "fillColor": "red"
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
            "fillColor": {}
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
            "fillColor": {}
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
              "scale": ""
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
              "scale": "p"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
              "scale": ""
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
              "scale": ""
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
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
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "",
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
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "density",
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
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "density",
          "minDensityCnt": 0
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "heatmap_query"
          },
          "properties": {
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "density",
          "minDensityCnt": 0,
          "maxDensityCnt": 1000
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "heatmap_query"
          },
          "properties": {
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "density",
          "minDensityCnt": 0,
          "maxDensityCnt": 100000
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "heatmap_query"
          },
          "properties": {
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
        }
      ]
    },
    {
      "width": 399,
      "height": 535,
      "data": [
        {
          "name": "heatmap_query",
          "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -12014254.628965287,
            -9693046.072701354
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            3280722.526925205,
            6393119.964520493
          ],
          "range": "height"
        },
        {
          "name": "party_color",
          "type": "threshold",
          "domain": [
            0.25,
            0.5,
            0.75
          ],
          "range": [
            "blue",
            "green",
            "red",
            "orange"
          ],
          "accumulator": "density",
          "minDensityCnt": 0,
          "maxDensityCnt": 10000
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "heatmap_query"
          },
          "properties": {
            "shape": "circle",
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
              "scale": "party_color",
              "field": "color"
            }
          }
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
      let results = con.renderVega(1, JSON.stringify(contributionPctAccumulation))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("accumulationTest", "accumulationTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(contributionPctAccumulation2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(contributionBlendAccumulation))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      contributionDensityAccumulations.forEach((density_accum_vega) => {
        try {
          results = con.renderVega(1, JSON.stringify(density_accum_vega))
          blobUrl = "data:image/png;base64," + results.image
          w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
        } catch (e) {
          console.log(e)
        }
      })
    })
})
