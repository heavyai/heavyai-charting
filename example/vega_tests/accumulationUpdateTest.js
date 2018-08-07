document.addEventListener("DOMContentLoaded", function init() {
  const update1Vegas = [
    {
      "width": 714,
      "height": 535,
      "data": [
        {
          "name": "table",
          "sql": "SELECT conv_4326_900913_x(lon) as x,  conv_4326_900913_y(lat) as y,amount,rowid FROM contributions WHERE (conv_4326_900913_x(lon) between -8261639.374260864 and -8208770.0500969095) AND (conv_4326_900913_y(lat) between 4955505.870715845 and 4995120.840502534) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -8261639.374260864,
            -8208770.0500969095
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            4955505.870715845,
            4995120.840502534
          ],
          "range": "height"
        },
        {
          "name": "pointcolor",
          "type": "threshold",
          "domain": [
            0.33,
            0.66
          ],
          "range": [
            "blue",
            "purple",
            "red"
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
              "scale": "pointcolor",
              "field": "amount"
            },
            "size": {
              "value": 5
            }
          }
        }
      ]
    },
    {
      "width": 714,
      "height": 535,
      "data": [
        {
          "name": "table",
          "sql": "SELECT conv_4326_900913_x(lon) as x,  conv_4326_900913_y(lat) as y,amount,rowid FROM contributions WHERE (conv_4326_900913_x(lon) between -8261639.374260864 and -8208770.0500969095) AND (conv_4326_900913_y(lat) between 4955505.870715845 and 4995120.840502534) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -8261639.374260864,
            -8208770.0500969095
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            4955505.870715845,
            4995120.840502534
          ],
          "range": "height"
        },
        {
          "name": "pointcolor",
          "type": "threshold",
          "domain": [
            0.33,
            0.66
          ],
          "range": [
            "blue",
            "purple",
            "red"
          ],
          "accumulator": "pct",
          "pctCategory": 1000,
          "pctCategoryMargin": 1000
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
              "scale": "pointcolor",
              "field": "amount"
            },
            "size": {
              "value": 5
            }
          }
        }
      ]
    },
    {
      "width": 714,
      "height": 535,
      "data": [
        {
          "name": "table",
          "sql": "SELECT conv_4326_900913_x(lon) as x,  conv_4326_900913_y(lat) as y,amount,rowid FROM contributions WHERE (conv_4326_900913_x(lon) between -8261639.374260864 and -8208770.0500969095) AND (conv_4326_900913_y(lat) between 4955505.870715845 and 4995120.840502534) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -8261639.374260864,
            -8208770.0500969095
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            4955505.870715845,
            4995120.840502534
          ],
          "range": "height"
        },
        {
          "name": "pointcolor",
          "type": "threshold",
          "domain": [
            0.33,
            0.66
          ],
          "range": [
            "blue",
            "purple",
            "red"
          ],
          "accumulator": "pct",
          "pctCategory": 125,
          "pctCategoryMargin": 125
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
              "scale": "pointcolor",
              "field": "amount"
            },
            "size": {
              "value": 5
            }
          }
        }
      ]
    },
    {
      "width": 714,
      "height": 535,
      "data": [
        {
          "name": "table",
          "sql": "SELECT conv_4326_900913_x(lon) as x,  conv_4326_900913_y(lat) as y,amount,rowid FROM contributions WHERE (conv_4326_900913_x(lon) between -8261639.374260864 and -8208770.0500969095) AND (conv_4326_900913_y(lat) between 4955505.870715845 and 4995120.840502534) LIMIT 2000000"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [
            -8261639.374260864,
            -8208770.0500969095
          ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [
            4955505.870715845,
            4995120.840502534
          ],
          "range": "height"
        },
        {
          "name": "pointcolor",
          "type": "threshold",
          "domain": [
            0.33,
            0.66
          ],
          "range": [
            "blue",
            "purple",
            "red"
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
              "scale": "pointcolor",
              "field": "amount"
            },
            "size": {
              "value": 5
            }
          }
        }
      ]
    }
  ]

  new MapdCon()
    .protocol("http")
    .host("10.1.0.49")
    .port("1024")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect(function(error, con) {
      let results = null
      let blobUrl = null
      let w = null

      update1Vegas.forEach((vega) => {
        results = con.renderVega(1, JSON.stringify(vega));
        blobUrl = 'data:image/png;base64,' + results.image;
        if (!w) {
          w=window.open('accumulationUpdateTest', 'accumulateUpdateTest results')
        }
        w.document.write("<img src='"+blobUrl+"' alt='backend-rendered png'/>")
      })
    })
})
