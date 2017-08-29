import { expect } from "chai"
import rasterLayer from "./raster-layer"
import rasterLayerPointMixin from "./raster-layer-heatmap-mixin"

describe.only("rasterLayerPointMixin", () => {
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
        mark: "point",
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
        field: "lon"
      },
      y: {
        type: "quantitative",
        field: "lat"
      },
      size: 11,
      color: "#27aeef"
    }

    describe("Sizing prop", () => {
      it("should properly transform manual sizing", () => {
        const layer = rasterLayer("points")
        layer.setState({
          mark: "point",
          encoding: baseEncoding
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100"
        })).to.deep.equal({
          data: {
            name: "points",
            sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
          },
          "scales": [],
           "mark": {
             "type": "points",
             "from": {
               "data": "points"
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
               "size": 11,
               "fillColor": "#27aeef"
             }
           }
        })
      })

      it("should properly transform auto sizing", () => {
        const layer = rasterLayer("points")

        layer.setState({
          transform: [{type: "limit", row: 2000000}],
          mark: "point",
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 13884,
          pixelRatio: 1
        }).properties.size.to.equal(4)

        layer.setState({
          transform: [{type: "limit", row: 2000000}],
          mark: "point",
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 223509,
          pixelRatio: 1
        })).properties.size.to.equal(2)

        layer.setState({
          transform: [{type: "limit", row: 2000000}],
          mark: "point",
          encoding: Object.assign({}, baseEncoding, {
            size: "auto"
          })
        })

        expect(layer.__genVega({
          table: "tweets_nov_feb",
          filter: "lon = 100",
          lastFilteredSize: 1947993,
          pixelRatio: 1
        })).properties.size.to.equal(1)

      })

      it("should properly transform field sizing", () => {
        const layer = rasterLayer("points")
        layer.setState({
          mark: "point",
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
        })).to.deep.equal({
          data: {
            name: "points",
            sql: "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, tweet_count as size, tweets_nov_feb.rowid FROM tweets_nov_feb WHERE (lon = 100)"
          },
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
           "mark": {
             "type": "points",
             "from": {
               "data": "points"
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
               "size": {
                  "scale": "points_size",
                  "field": "size"
                },
               "fillColor": "#27aeef"
             }
           }
        })
      })
    })

    xdescribe("Color prop", () => {
      it("should properly transform density coloring", () => {

      })

      it("should properly transform quantitative and ordinal coloring", () => {

      })
    })

  })
})
