document.addEventListener("DOMContentLoaded", () => {
  const poly_update1 = {
    "width": 793,
    "height": 1060,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": "SELECT rowid from zipcodes_2017"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-113.154, -81.846],
          "y": [22.0, 54.0]
        }
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "polys"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": "red"
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const poly_update2 = {
    "width": 793,
    "height": 1060,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": "SELECT rowid from zipcodes_2017"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-113.154, -81.846],
          "y": [22.0, 54.0]
        }
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "polys"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": "red",
          "strokeColor": "blue",
          "strokeWidth": 1
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const poly_update3 = {
    "width": 793,
    "height": 1060,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": "SELECT rowid from zipcodes_2017"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-113.154, -81.846],
          "y": [22.0, 54.0]
        }
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "polys"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": "rgba(0,0,0,0)",
          "strokeColor": "blue",
          "strokeWidth": 1
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const poly_update4 = {
    "width": 733,
    "height": 530,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE '55___'"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.390, -66.94],
          "y": [20.6157, 52.9312]
        }
      }
    ],
    "scales": [
      {
        "name": "polys_fillColor",
        "type": "ordinal",
        "domain": ["89049"],
        "range": ["red"],
        "default": "blue",
        "nullValue": "#cacaca"
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "polys"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "polys_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const poly_update5 = {
    "width": 733,
    "height": 530,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE 'ab___'"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.390, -66.94],
          "y": [20.6157, 52.9312]
        }
      }
    ],
    "scales": [
      {
        "name": "polys_fillColor",
        "type": "ordinal",
        "domain": ["89049"],
        "range": ["red"],
        "default": "blue",
        "nullValue": "#cacaca"
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "polys"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "polys_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }

  const poly_quantitative_scales = [
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "linear",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "sqrt",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "log",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "pow",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true,
          "exponent": 1
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "pow",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true,
          "exponent": 2
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "pow",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true,
          "exponent": 0.25
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    }
  ]

  const poly_quantitative_scale_errors = [
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "sqrt",
          "domain": [-1,880000000],
          "range": ["blue","red"],
          "clamp": true
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "log",
          "domain": [0,880000000],
          "range": ["blue","red"],
          "clamp": true
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "pow",
          "domain": [-1,880000000],
          "range": ["blue","red"],
          "clamp": true,
          "exponent": 1.5
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 793,
      "height": 1060,
      "data": [
        {
          "name": "table",
          "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
          "format": "polys"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-113.154, -81.846],
            "y": [22.0, 54.0]
          }
        }
      ],
      "scales": [
        {
          "name": "color",
          "type": "pow",
          "domain": [1,880000000],
          "range": ["blue","red"],
          "clamp": true,
          "exponent": 200
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "table"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {"scale": "color","field": "ALAND10"}
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    }
  ]

  const poly_nycbuilding_updates = [
    {
      "width": 1280,
      "height": 840,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "sql": "SELECT nyc_buildings.rowid, nyc_buildings.bbl as key0, avg(heightroof) as color FROM nyc_buildings GROUP BY nyc_buildings.rowid, key0"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-74.02, -73.9488],
            "y": [40.7043, 40.73992]
          }
        }
      ],
      "scales": [
        {
          "name": "backendChoropleth_fillColor",
          "type": "quantize",
          "domain": [
            0,
            500
          ],
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
          ],
          "nullValue": "#D6D7D6",
          "default": "#D6D7D6"
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeColor": "white",
            "strokeWidth": 0.5,
            "lineJoin": "miter",
            "miterLimit": 10
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 1280,
      "height": 840,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "sql": "SELECT nyc_buildings.rowid, nyc_buildings.bbl as key0, avg(heightroof) as color FROM nyc_buildings GROUP BY nyc_buildings.rowid, key0"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-74.0363173040059, -73.93220681064426],
            "y": [40.70051339409347, 40.75229049587891]
          }
        }
      ],
      "scales": [
        {
          "name": "backendChoropleth_fillColor",
          "type": "quantize",
          "domain": [
            0,
            500
          ],
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
          ],
          "nullValue": "#D6D7D6",
          "default": "#D6D7D6"
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeColor": "white",
            "strokeWidth": 0.5,
            "lineJoin": "miter",
            "miterLimit": 10
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    },
    {
      "width": 1280,
      "height": 840,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "sql": "SELECT nyc_buildings.rowid, nyc_buildings.bbl as key0, avg(cnstrct_yr) as color FROM nyc_buildings GROUP BY nyc_buildings.rowid, key0"
        }
      ],
      "projections": [
        {
          "name": "merc",
          "type": "mercator",
          "bounds": {
            "x": [-74.0363173040059, -73.93220681064426],
            "y": [40.70051339409347, 40.75229049587891]
          }
        }
      ],
      "scales": [
        {
          "name": "backendChoropleth_fillColor",
          "type": "quantize",
          "domain": [
            0,
            675714015.3333334
          ],
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
          ],
          "nullValue": "#D6D7D6",
          "default": "#D6D7D6"
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeColor": "white",
            "strokeWidth": 0.5,
            "lineJoin": "miter",
            "miterLimit": 10
          },
          "transform": {
            "projection": "merc"
          }
        }
      ]
    }
  ]

  // the following is a query with an empty set of results
  const poly_empty_join = {
      "width": 729,
      "height": 767,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT mapd_countries.rowid, tweets_2017_may.country as key0, avg(followees) as color FROM tweets_2017_may, mapd_countries WHERE (tweets_2017_may.country = mapd_countries.name) GROUP BY mapd_countries.rowid, key0"
        },
        {
          "name": "backendChoropleth_stats",
          "source": "backendChoropleth",
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
            -18608022.565838475,
            19356755.56146388
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            -19971868.878040362,
            19971868.877909187
          ],
          "range": "height"
        },
        {
          "name": "backendChoropleth_fillColor",
          "type": "quantize",
          "domain": {
            "data": "backendChoropleth_stats",
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
          ],
          "nullValue": "rgba(214, 215, 214, 0.65)",
          "default": "rgba(214, 215, 214, 0.65)"
        }
      ],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [
              -167.15871080427152,
              173.88469374214333
            ],
            "y": [
              -85.00000000000024,
              85.00000000000028
            ]
          }
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeWidth": 0
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        }
      ]
    }

  // Support last sample with ordinal scales
  const poly_last_sample = {
      "width": 1600,
      "height": 1120,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT zipcodes_2017.rowid, LAST_SAMPLE(ZCTA5CE10) as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid"
        }
      ],
      "scales": [
        {
          "name": "backendChoropleth_fillColor",
          "type": "ordinal",
          "domain": [
            "94960",
            "94117",
            "55353",
            "19103",
            "10023"
          ],
          "range": [
            "rgba(234,85,69,0.85)",
            "rgba(189,207,50,0.85)",
            "rgba(179,61,198,0.85)",
            "rgba(239,155,32,0.85)",
            "rgba(39,174,239,0.85)"
          ],
          "nullValue": "rgba(214, 215, 214, 0.65)",
          "default": "rgba(214, 215, 214, 0.65)"
        }
      ],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [-124.88749638788404, -64.60538826379779],
            "y": [20.1188223979657, 53.008194919853]
          }
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeWidth": 0
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        }
      ]
    }

  const poly_case_last_sample = {
      "width": 1600,
      "height": 1120,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT zipcodes_2017.rowid, CASE WHEN rowid IN (25101) THEN LAST_SAMPLE(ZCTA5CE10) END as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid"
        }
      ],
      "scales": [
        {
          "name": "backendChoropleth_fillColor",
          "type": "ordinal",
          "domain": [
            "59301",
          ],
          "range": [
            "red"
          ],
          "nullValue": "rgba(214, 215, 214, 0.65)",
          "default": "rgba(214, 215, 214, 0.65)"
        }
      ],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [-124.88749638788404, -64.60538826379779],
            "y": [20.1188223979657, 53.008194919853]
          }
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoropleth"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeWidth": 0
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        }
      ]
    }

  const poly_bigint_in_formula_transform = {
      "width": 1163,
      "height": 1057,
      "data": [
        {
          "name": "backendChoropleth",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT us_states.rowid, contributions.contributor_state as key0, sum(amount) as color FROM contributions, us_states WHERE (contributions.contributor_state = us_states.STUSPS) GROUP BY us_states.rowid, key0"
        },
        {
          "name": "backendChoropleth_stats",
          "source": "backendChoropleth",
          "transform": [
            {
              "type": "aggregate",
              "fields": ["color","color","color","color"],
              "ops": ["min","max","avg","stddev"],
              "as": ["mincol","maxcol","avgcol","stdcol"]
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
          "name": "backendChoropleth_fillColor",
          "type": "quantize",
          "domain": {
            "data": "backendChoropleth_stats",
            "fields": ["mincolor","maxcolor"]
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
          ],
          "nullValue": "rgba(214, 215, 214, 0.65)",
          "default": "rgba(214, 215, 214, 0.65)"
        }
      ],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [-170.0945829750607,-64.53998280309563],
            "y": [11.995988718699394,72.73829971440733]
          }
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {"data": "backendChoropleth"},
          "properties": {
            "x": {"field": "x"},
            "y": {"field": "y"},
            "fillColor": {
              "scale": "backendChoropleth_fillColor",
              "field": "color"
            },
            "strokeWidth": 0
          },
          "transform": {"projection": "mercator_map_projection"}
        }
      ]
    }

    const multi_overflow_buffers = {
      "width": 1051,
      "height": 1057,
      "data": [
        {
          "name": "backendChoroplethLayer0",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT nyc_buildings.rowid as rowid FROM nyc_buildings"
        },
        {
          "name": "backendChoroplethLayer1",
          "format": "polys",
          "geocolumn": "mapd_geo",
          "sql": "SELECT nyc_buildings.rowid as rowid FROM nyc_buildings"
        }
      ],
      "scales": [],
      "projections": [
        {
          "name": "mercator_map_projection",
          "type": "mercator",
          "bounds": {
            "x": [-74.01063572788345,-73.98152242299047],
            "y": [40.73545650059788,40.75763878211973]
          }
        }
      ],
      "marks": [
        {
          "type": "polys",
          "from": {
            "data": "backendChoroplethLayer0"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "value": "rgba(234,85,69,0.0)"
            },
            "strokeColor": "red",
            "strokeWidth": 4,
            "lineJoin": "round"
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        },
        {
          "type": "polys",
          "from": {
            "data": "backendChoroplethLayer1"
          },
          "properties": {
            "x": {
              "field": "x"
            },
            "y": {
              "field": "y"
            },
            "fillColor": {
              "value": "rgba(244,106,155,0.0)"
            },
            "strokeColor": "blue",
            "strokeWidth": 2,
            "lineJoin": "round"
          },
          "transform": {
            "projection": "mercator_map_projection"
          }
        }
      ]
    }

  const insitu_poly_test = {
    "width": 1117,
    "height": 1116,
    "data": [
      {
        "name": "polys_projected3",
        "format": "polys",
        "sql": "SELECT rowid, mapd_geo, MapD_GeoPolyBoundsPtr(mapd_geo) AS mapd_geo_bounds, MapD_GeoPolyRenderGroup(mapd_geo) AS mapd_geo_render_group, NAME as color FROM mapd_states WHERE (ST_XMax(mapd_geo) >= -171.94850212956538 AND ST_XMin(mapd_geo) <= -64.23798693816666 AND ST_YMax(mapd_geo) >= 4.89805464614507 AND ST_YMin(mapd_geo) <= 74.02453067764594)",
        "enableInSituPolys": true
      }
    ],
    "projections": [
      {
        "name": "projection",
        "type": "mercator",
        "bounds": {
          "x": [-171.94850212956538,-64.23798693816666],
          "y": [4.89805464614507,74.02453067764594]
        }
      }
    ],
    "scales": [
      {
        "name": "polys_fillColor",
        "type": "ordinal",
        "domain": [
          "California",
          "Florida",
          "Texas",
          "Kentucky",
          "Minnesota",
          "Colorado"
        ],
        "range": ["blue","red","yellow","green","cyan","magenta"],
        "default": "gray",
        "nullValue": "#cacaca "
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {"data": "polys_projected3"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "fillOpacity": 0.8,
          "fillColor": {"scale": "polys_fillColor","field": "color"},
          "strokeColor": "green",
          "strokeWidth": 1,
          "lineJoin": "miter",
          "miterLimit": 10
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

      let results = con.renderVega(1, JSON.stringify(poly_update1))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("polyUpdateTest", "polyUpdateTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update1))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_update4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // poly_update5 should be an empty image
      results = con.renderVega(1, JSON.stringify(poly_update5))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      poly_quantitative_scales.forEach(vega => {
        results = con.renderVega(1, JSON.stringify(vega))
        blobUrl = "data:image/png;base64," + results.image
        w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
      })

      // all these should error
      poly_quantitative_scale_errors.forEach(vega => {
        try {
          results = con.renderVega(1, JSON.stringify(vega))
        } catch (e) {
          if (e instanceof window.TMapDException) {
            console.log(e)
          } else {
            throw e
          }
        }
      })

      poly_nycbuilding_updates.forEach(vega => {
        results = con.renderVega(1, JSON.stringify(vega))
        blobUrl = "data:image/png;base64," + results.image
        w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
      })

      results = con.renderVega(1, JSON.stringify(poly_empty_join))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_last_sample))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_case_last_sample))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(poly_bigint_in_formula_transform))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(multi_overflow_buffers))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(insitu_poly_test))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

    })
})
