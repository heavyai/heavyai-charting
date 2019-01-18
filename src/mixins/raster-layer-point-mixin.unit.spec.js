import chai, { expect } from "chai"
import spies from "chai-spies"
import rasterLayer from "./raster-layer"

chai.use(spies)

describe("rasterLayerPointMixin", () => {
  it("should have the correct getters/setters", () => {
    const layer = rasterLayer("points")
    const xDim = "xDim"
    const yDim = "yDim"
    layer.xDim(xDim)
    layer.yDim(yDim)
    expect(layer.xDim()).to.equal(xDim)
    expect(layer.yDim()).to.equal(yDim)
  })

  describe("layer state", () => {
    it("should be able to be set and retrieved", () => {
      const layer = rasterLayer("points")
      const spec = {
        config: {
          point: {
            shape: "cross"
          }
        },
        encoding: {
          x: {
            type: "quantitative",
            field: "lon"
          },
          y: {
            type: "quantitative",
            field: "lat"
          },
          color: "blue",
          size: 11
        }
      }
      layer.setState(spec)
      expect(layer.getState()).to.deep.equal(spec)
    })
  })

  describe("__genVega", () => {

    const baseEncoding = {
      x: {
        type: "quantitative",
        field: "conv_4326_900913_x(lon)"
      },
      y: {
        type: "quantitative",
        field: "conv_4326_900913_y(lat)"
      },
      size: 11,
      color: "#27aeef"
    }
    describe("symbol mark types", () => {
      it("should handle crosses", () => {
        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: baseEncoding,
          config: {
            point: {
              shape: "cross"
            }
          }
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points",
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
              },
              "properties": {
                shape: "cross",
                "xc": {
                  "scale": "x",
                  "field": "x"
                },
                "yc": {
                  "scale": "y",
                  "field": "y"
                },
                "width": 11,
                "height": 11,
                "fillColor": "#27aeef"
              }
            }
          ]
        })
      })
    })

    describe("sampling", () => {
      it("should set sampling transform", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {
            limit: 2000000,
            sample: true
          },
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: baseEncoding
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 1189279639,
          pixelRatio: 1,
          layerName: "points"
        }).data[0].sql).to.equal(
          "SELECT conv_4326_900913_x(lon) as x, "
          + "conv_4326_900913_y(lat) as y, "
          + "tweets_nov_feb.rowid FROM tweets_nov_feb "
          + "WHERE MOD( MOD (tweets_nov_feb.rowid, 4294967296) * 2654435761 , 4294967296) < 7222804 "
          + "AND (lon = 100) LIMIT 2000000"
        )

      })
    })

    describe("Sizing prop", () => {
      it("should properly transform manual sizing", () => {
        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: baseEncoding
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "height": 11,
                "width": 11,
                "shape": "cross",
                "fillColor": "#27aeef"
              }
            }
          ]
        })
      })

      it("should properly transform auto sizing", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 13884,
          pixelRatio: 1,
          layerName: "points"
        }).marks[0].properties.width).to.equal(4)

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 223509,
          pixelRatio: 1,
          layerName: "points"
        }).marks[0].properties.width).to.equal(2)

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 1947993,
          pixelRatio: 1,
          layerName: "points"
        }).marks[0].properties.height).to.equal(1)

      })

      it("should properly transform field sizing", () => {
        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: {
              type: "quantitative",
              field: "tweet_count",
              domain: [-5000000, 25177212],
              range: [3, 10]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as size, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [
            {
             "name": "points_size",
             "type": "linear",
             "domain": [
               -5000000,
               25177212
             ],
             "range": [
               3,
               10
             ],
             "clamp": true
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": {
                  "scale": "points_size",
                  "field": "size"
                },
                "height": {
                  "scale": "points_size",
                  "field": "size"
                },
                "shape": "cross",
                "fillColor": "#27aeef"
              }
            }
          ]
        })
      })

      it("should properly create vega transforms for \"auto\" used in size scale domain", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: {
              type: "quantitative",
              field: "tweet_count",
              domain: "auto",
              range: [3, 8, 15, 25]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as size, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100) LIMIT 2000000"
            },
            {
              name: "points_stats",
              source: "points",
              transform: [
                {
                  type: "aggregate",
                  fields: ["size", "size", "size", "size"],
                  ops: ["min", "max", "avg", "stddev"],
                  as: ["minsz", "maxsz", "avgsz", "stdsz"]
                },
                {
                  type: "formula",
                  expr: "max(minsz, avgsz-2*stdsz)",
                  as: "minsize"
                },
                {
                  type: "formula",
                  expr: "min(maxsz, avgsz+2*stdsz)",
                  as: "maxsize"
                }
              ]
            }
          ],
          "scales": [
            {
             "name": "points_size",
             "type": "linear",
             "domain": {data: "points_stats", fields: ["minsize", "maxsize"]},
             "range": [
               3,
               8,
               15,
               25
             ],
             "clamp": true
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": {
                  "scale": "points_size",
                  "field": "size"
                },
                "height": {
                  "scale": "points_size",
                  "field": "size"
                },
                "shape": "cross",
                "fillColor": "#27aeef"
              }
            }
          ]
        })
      })
    })

    describe("Color prop", () => {
      it("should properly transform density coloring", () => {

        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            color: {
              type: "density",
              range: ["#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [
            {
              "name": "points_fillColor",
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
                "rgba(17,95,154,0.625)",
                "rgba(25,132,197,0.6971153846153846)",
                "rgba(34,167,240,0.7692307692307692)",
                "rgba(72,181,196,0.8413461538461539)",
                "rgba(118,198,143,0.9134615384615384)",
                "rgba(166,215,91,0.985576923076923)",
                "rgba(201,229,47,1)",
                "rgba(208,238,17,1)",
                "rgba(208,244,0,1)"
              ],
              "accumulator": "density",
              "minDensityCnt": "-2ndStdDev",
              "maxDensityCnt": "2ndStdDev",
              "clamp": true
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": 11,
                "height": 11,
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "value": 0
                }
              }
            }
          ]
        })
      })

      it("should properly transform quantitative and ordinal coloring", () => {
        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            color: {
              type: "ordinal",
              field: "party",
              domain: ["D", "R", "I"],
              range: ["red", "green", "blue"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, party as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [
            {
              "name": "points_fillColor",
              "type": "ordinal",
              "domain": ["D", "R", "I"],
              "range": ["red", "green", "blue"],
              "default": "blue",
              "nullValue": "rgba(202,202,202,1)"
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": 11,
                "height": 11,
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })

      })


      it("should adjust opacity on colors", () => {
        const layer = rasterLayer("points")
        layer.setState({
          transform: {},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            color: {
              type: "ordinal",
              field: "party",
              domain: ["D", "R", "I"],
              range: ["#115f9a", "#1984c5", "#22a7f0"],
              opacity: 0.2
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, party as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
            }
          ],
          "scales": [
            {
              "name": "points_fillColor",
              "type": "ordinal",
              "domain": ["D", "R", "I"],
              "range": ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"],
              "default": "rgba(34,167,240,0.2)",
              "nullValue": "rgba(202,202,202,0.2)"
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": 11,
                "height": 11,
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })

      })

      it("should properly create vega transforms for \"auto\" used in quantitative scale domain", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            color: {
              type: "quantitative",
              field: "tweet_count",
              domain: "auto",
              range: ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100) LIMIT 2000000"
            },
            {
              name: "points_stats",
              source: "points",
              transform: [
                {
                  type: "aggregate",
                  fields: ["color", "color", "color", "color"],
                  ops: ["min", "max", "avg", "stddev"],
                  as: ["mincol", "maxcol", "avgcol", "stdcol"]
                },
                {
                  type: "formula",
                  expr: "max(mincol, avgcol-2*stdcol)",
                  as: "mincolor"
                },
                {
                  type: "formula",
                  expr: "min(maxcol, avgcol+2*stdcol)",
                  as: "maxcolor"
                }
              ]
            }
          ],
          "scales": [
            {
             "name": "points_fillColor",
             "type": "quantize",
             "domain": {data: "points_stats", fields: ["mincolor", "maxcolor"]},
             "range": ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": 11,
                "height": 11,
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })
      })

      it("should properly create vega transforms for \"auto\" used in ordinal scale domain", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            color: {
              type: "ordinal",
              field: "party",
              domain: "auto",
              range: ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, party as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100) LIMIT 2000000"
            },
            {
              name: "points_stats",
              source: "points",
              transform: [
                {
                  type: "aggregate",
                  fields: ["color"],
                  ops: ["distinct"],
                  as: ["distinctcolor"]
                }
              ]
            }
          ],
          "scales": [
            {
             "name": "points_fillColor",
             "type": "ordinal",
             "domain": {data: "points_stats", fields: ["distinctcolor"]},
             "range": ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"],
             "default": "rgba(34,167,240,0.2)",
             "nullValue": "rgba(202,202,202,1)"
           }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": 11,
                "height": 11,
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })
      })

      it("should properly create vega transforms for \"auto\" used in both color and size scale domains", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: {
              type: "quantitative",
              field: "tweet_count",
              domain: "auto",
              range: [3, 8, 15, 25]
            },
            color: {
              type: "ordinal",
              field: "party",
              domain: "auto",
              range: ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as size, party as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100) LIMIT 2000000"
            },
            {
              name: "points_stats",
              source: "points",
              transform: [
                {
                  type: "aggregate",
                  fields: ["color", "size", "size", "size", "size"],
                  ops: ["distinct", "min", "max", "avg", "stddev"],
                  as: ["distinctcolor", "minsz", "maxsz", "avgsz", "stdsz"]
                },
                {
                  type: "formula",
                  expr: "max(minsz, avgsz-2*stdsz)",
                  as: "minsize"
                },
                {
                  type: "formula",
                  expr: "min(maxsz, avgsz+2*stdsz)",
                  as: "maxsize"
                }
              ]
            }
          ],
          "scales": [
            {
              "name": "points_size",
              "type": "linear",
              "domain": {data: "points_stats", fields: ["minsize", "maxsize"]},
              "range": [
                3,
                8,
                15,
                25
              ],
              "clamp": true
            },
            {
              "name": "points_fillColor",
              "type": "ordinal",
              "domain": {data: "points_stats", fields: ["distinctcolor"]},
              "range": ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"],
              "default": "rgba(34,167,240,0.2)",
              "nullValue": "rgba(202,202,202,1)"
            }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": {
                  "scale": "points_size",
                  "field": "size"
                },
                "height": {
                  "scale": "points_size",
                  "field": "size"
                },
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })

        layer.setState({
          transform: {limit: 2000000},
          config: {
            point: {
              shape: "cross"
            }
          },
          encoding: Object.assign({}, baseEncoding, {
            size: {
              type: "quantitative",
              field: "tweet_count",
              domain: "auto",
              range: [3, 8, 15, 25]
            },
            color: {
              type: "quantitative",
              field: "tweet_count",
              domain: "auto",
              range: ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
            }
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          layerName: "points"
        })).to.deep.equal({
          data: [
            {
              name: "points",
              sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as size, tweet_count as color, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100) LIMIT 2000000"
            },
            {
              name: "points_stats",
              source: "points",
              transform: [
                {
                  type: "aggregate",
                  fields: ["color", "color", "color", "color", "size", "size", "size", "size"],
                  ops: ["min", "max", "avg", "stddev", "min", "max", "avg", "stddev"],
                  as: ["mincol", "maxcol", "avgcol", "stdcol", "minsz", "maxsz", "avgsz", "stdsz"]
                },
                {
                  type: "formula",
                  expr: "max(mincol, avgcol-2*stdcol)",
                  as: "mincolor"
                },
                {
                  type: "formula",
                  expr: "min(maxcol, avgcol+2*stdcol)",
                  as: "maxcolor"
                },
                {
                  type: "formula",
                  expr: "max(minsz, avgsz-2*stdsz)",
                  as: "minsize"
                },
                {
                  type: "formula",
                  expr: "min(maxsz, avgsz+2*stdsz)",
                  as: "maxsize"
                }
              ]
            }
          ],
          "scales": [
            {
              "name": "points_size",
              "type": "linear",
              "domain": {data: "points_stats", fields: ["minsize", "maxsize"]},
              "range": [
                3,
                8,
                15,
                25
              ],
              "clamp": true
            },
            {
              "name": "points_fillColor",
              "type": "quantize",
              "domain": {data: "points_stats", fields: ["mincolor", "maxcolor"]},
              "range": ["rgba(17,95,154,0.2)", "rgba(25,132,197,0.2)", "rgba(34,167,240,0.2)"]
            }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {
                "data": "points"
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
                "width": {
                  "scale": "points_size",
                  "field": "size"
                },
                "height": {
                  "scale": "points_size",
                  "field": "size"
                },
                "shape": "cross",
                "fillColor": {
                  "scale": "points_fillColor",
                  "field": "color"
                }
              }
            }
          ]
        })
      })

    })
  })

  describe("getProjections", () => {
    it("should return project statements", () => {
      const layer = rasterLayer("points")

      layer.crossfilter({
        getId: () => 1
      })

      layer.setState({
        transform: {},
        config: {
          point: {
            shape: "cross"
          }
        },
        encoding: {
          x: {
            type: "quantitative",
            field: "conv_4326_900913_x(lon)"
          },
          y: {
            type: "quantitative",
            field: "conv_4326_900913_y(lat)"
          },
          size: 11,
          color: {
            type: "ordinal",
            field: "party",
            domain: ["D", "R", "I"],
            range: ["#115f9a", "#1984c5", "#22a7f0"]
          }
        }
      })

      expect(layer.getProjections()).to.deep.equal([
        "conv_4326_900913_x(lon) as x",
        "conv_4326_900913_y(lat) as y",
        "party as color"
      ])
    })
  })

  describe("popup methods", () => {
    const cf = {
      getTable: () => ["flights"],
      getFilterString: () => "",
      getGlobalFilterString: () => "",
      getId: () => 1
    }

    const chart = {
      _getPixelRatio: () => 1
    }

    describe("_addRenderAttrsToPopupColumnSet", () => {
      const layer = rasterLayer("points")
      layer.setState({
        transform: [
          {
            type: "limit",
            row: 500000
          }
        ],
        config: {
          point: {
            shape: "cross"
          }
        },
        encoding: {
          x: {
            type: "quantitative",
            field: "lon"
          },
          y: {
            type: "quantitative",
            field: "lat"
          },
          size: "auto",
          color: {
            type: "ordinal",
            field: "lang",
            domain: ["d", "r"],
            range: ["red", "blue"]
          }
        }
      })
      layer.crossfilter(cf)
      layer._genVega(chart)
      layer._addQueryDrivenRenderPropToSet = chai.spy()
      it("should", () => {
        const set = {}
        layer._addRenderAttrsToPopupColumnSet({}, set)
        const vega = layer._genVega(chart)
        expect(layer._addQueryDrivenRenderPropToSet).to.have.been.called.with(set, vega.marks[0].properties, "xc")
        expect(layer._addQueryDrivenRenderPropToSet).to.have.been.called.with(set, vega.marks[0].properties, "yc")
        expect(layer._addQueryDrivenRenderPropToSet).to.have.been.called.with(set, vega.marks[0].properties, "width")
        expect(layer._addQueryDrivenRenderPropToSet).to.have.been.called.with(set, vega.marks[0].properties, "height")
        expect(layer._addQueryDrivenRenderPropToSet).to.have.been.called.with(set, vega.marks[0].properties, "fillColor")
      })
    })

    describe("_areResultsValidForPopup", () => {
      it("should", () => {
        const layer = rasterLayer("points")
        expect(layer._areResultsValidForPopup({})).to.equal(false)
        expect(layer._areResultsValidForPopup({x: 1, y: 1})).to.equal(true)
      })
    })
  })
})
