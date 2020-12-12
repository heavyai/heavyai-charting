import chai, { expect } from "chai"
import spies from "chai-spies"
import rasterLayer from "./raster-layer"

chai.use(spies)

describe("rasterLayerPolyMixin", () => {
  describe("layer state", () => {
    it("should be able to be set and retrieved", () => {
      const layer = rasterLayer("polys")
      const spec = {
        mark: {
          type: "poly",
          strokeColor: "black",
          strokeWidth: 1,
          lineJoin: "miter",
          miterLimit: 10
        },
        encoding: {
          color: {
            type: "quantitative",
            aggregate: "COUNT(*)",
            domain: [0, 100],
            range: ["black", "blue"]
          }
        }
      }
      layer.setState(spec)
      expect(layer.getState()).to.deep.equal(spec)
    })
  })

  describe("genVega", () => {
    it("should generate the correct vega spec with projections", () => {
      const layer = rasterLayer("polys")
      layer.setState({
        data: [
          {
            table: "contributions_donotmodify",
            attr: "contributor_zipcode"
          },
          {
            table: "zipcodes",
            attr: "ZCTA5CE10"
          }
        ],
        transform: {
          sample: true,
          limit: 1000000,
          tableSize: 500000
        },
        mark: {
          type: "poly",
          strokeColor: "black",
          strokeWidth: 5,
          lineJoin: "miter",
          miterLimit: 20
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
          color: {
            type: "quantitative",
            aggregate: "AVG(contributions_donotmodify.amount)",
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo",
          geoTable: "zipcodes"
        },
        enableHitTesting: true
      })
      layer.crossfilter({
        getId: () => 1
      })

      expect(
        layer.__genVega({
          table: "contribs",
          layerName: "polys",
          filter: "amount=0",
          useProjection: true
        })
      ).to.deep.equal({
        data: [
          {
            name: "polys",
            format: "polys",
            sql:
              "WITH colors AS (SELECT contributions_donotmodify.contributor_zipcode AS key0, AVG(contributions_donotmodify.amount) AS color0 FROM contributions_donotmodify WHERE (amount=0) GROUP BY key0) SELECT zipcodes.mapd_geo AS mapd_geo, colors.key0 AS key0, colors.color0 AS color FROM zipcodes, colors WHERE (zipcodes.ZCTA5CE10 = colors.key0)",
            enableHitTesting: true
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214,215,214,0.65)",
            default: "rgba(214, 215, 214, 0.65)"
          }
        ],
        marks: [
          {
            type: "polys",
            from: { data: "polys" },
            properties: {
              x: {
                field: "x"
              },
              y: {
                field: "y"
              },
              fillColor: {
                scale: "polys_fillColor",
                field: "color"
              },
              strokeColor: "black",
              strokeWidth: 5,
              lineJoin: "miter",
              miterLimit: 20
            },
            transform: {
              projection: "mercator_map_projection"
            }
          }
        ]
      })
    })

    it("should generate the correct vega spec without projections", () => {
      const layer = rasterLayer("polys")
      layer.setState({
        data: [
          {
            table: "contributions_donotmodify",
            attr: "contributor_zipcode"
          },
          {
            table: "zipcodes",
            attr: "ZCTA5CE10"
          }
        ],
        transform: {
          sample: true,
          limit: 1000000,
          tableSize: 500000
        },
        mark: {
          type: "poly",
          strokeColor: "black",
          strokeWidth: 5,
          lineJoin: "miter",
          miterLimit: 20
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
          color: {
            type: "quantitative",
            aggregate: "AVG(contributions_donotmodify.amount)",
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo",
          geoTable: "zipcodes"
        },
        enableHitTesting: true
      })
      layer.crossfilter({
        getId: () => 1
      })

      expect(
        layer.__genVega({
          table: "contribs",
          layerName: "polys",
          filter: "amount=0",
          useProjection: false
        })
      ).to.deep.equal({
        data: [
          {
            name: "polys",
            format: "polys",
            sql:
              "WITH colors AS (SELECT contributions_donotmodify.contributor_zipcode AS key0, AVG(contributions_donotmodify.amount) AS color0 FROM contributions_donotmodify WHERE (amount=0) GROUP BY key0) SELECT zipcodes.mapd_geo AS mapd_geo, colors.key0 AS key0, colors.color0 AS color FROM zipcodes, colors WHERE (zipcodes.ZCTA5CE10 = colors.key0)",
            enableHitTesting: true
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214,215,214,0.65)",
            default: "rgba(214, 215, 214, 0.65)"
          }
        ],
        marks: [
          {
            type: "polys",
            from: { data: "polys" },
            properties: {
              x: {
                field: "x",
                scale: "x"
              },
              y: {
                field: "y",
                scale: "y"
              },
              fillColor: {
                scale: "polys_fillColor",
                field: "color"
              },
              strokeColor: "black",
              strokeWidth: 5,
              lineJoin: "miter",
              miterLimit: 20
            }
          }
        ]
      })
    })

    it("should generate the correct vega spec without projections", () => {
      const layer = rasterLayer("polys")
      layer.setState({
        data: [
          {
            table: "contributions_donotmodify",
            attr: "contributor_zipcode"
          },
          {
            table: "zipcodes",
            attr: "ZCTA5CE10"
          }
        ],
        transform: {
          sample: true,
          limit: 1000000,
          tableSize: 500000
        },
        mark: {
          type: "poly",
          strokeColor: "black",
          strokeWidth: 5,
          lineJoin: "miter",
          miterLimit: 20
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
          color: {
            type: "quantitative",
            aggregate: "AVG(contributions_donotmodify.amount)",
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo",
          geoTable: "zipcodes"
        },
        enableHitTesting: true
      })
      layer.crossfilter({
        getId: () => 1
      })

      expect(
        layer.__genVega({
          table: "contribs",
          layerName: "polys",
          filter: "amount=0",
          filtersInverse: false
        })
      ).to.deep.equal({
        data: [
          {
            name: "polys",
            format: "polys",
            enableHitTesting: true,
            sql:
              "WITH colors AS (SELECT contributions_donotmodify.contributor_zipcode AS key0, AVG(contributions_donotmodify.amount) AS color0 FROM contributions_donotmodify WHERE (amount=0) GROUP BY key0) SELECT zipcodes.mapd_geo AS mapd_geo, colors.key0 AS key0, colors.color0 AS color FROM zipcodes, colors WHERE (zipcodes.ZCTA5CE10 = colors.key0)"
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214,215,214,0.65)",
            default: "rgba(214, 215, 214, 0.65)"
          }
        ],
        marks: [
          {
            type: "polys",
            from: { data: "polys" },
            properties: {
              x: {
                field: "x",
                scale: "x"
              },
              y: {
                field: "y",
                scale: "y"
              },
              fillColor: {
                scale: "polys_fillColor",
                field: "color"
              },
              strokeColor: "black",
              strokeWidth: 5,
              lineJoin: "miter",
              miterLimit: 20
            }
          }
        ]
      })
    })

    it('should generate the correct vega spec with "auto" color domain', () => {
      const layer = rasterLayer("polys")
      layer.setState({
        data: [
          {
            table: "contributions_donotmodify",
            attr: "contributor_zipcode"
          },
          {
            table: "zipcodes",
            attr: "ZCTA5CE10"
          }
        ],
        transform: {
          limit: 1000000
        },
        mark: {
          type: "poly",
          strokeColor: "black",
          strokeWidth: 5,
          lineJoin: "miter",
          miterLimit: 20
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
          color: {
            type: "quantitative",
            aggregate: "AVG(contributions_donotmodify.amount)",
            domain: "auto",
            range: ["black", "blue"]
          },
          geocol: "mapd_geo",
          geoTable: "zipcodes"
        },
        enableHitTesting: true
      })
      layer.crossfilter({
        getId: () => 1
      })
      expect(
        layer.__genVega({
          table: "contribs",
          layerName: "polys",
          filter: "amount=0",
          useProjection: false
        })
      ).to.deep.equal({
        data: [
          {
            name: "polys",
            format: "polys",
            sql:
              "WITH colors AS (SELECT contributions_donotmodify.contributor_zipcode AS key0, AVG(contributions_donotmodify.amount) AS color0 FROM contributions_donotmodify WHERE (amount=0) GROUP BY key0) SELECT zipcodes.mapd_geo AS mapd_geo, colors.key0 AS key0, colors.color0 AS color FROM zipcodes, colors WHERE (zipcodes.ZCTA5CE10 = colors.key0)",
            enableHitTesting: true
          },
          {
            name: "polys_stats",
            source: "polys",
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
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: { data: "polys_stats", fields: ["mincolor", "maxcolor"] },
            range: ["black", "blue"],
            nullValue: "rgba(214,215,214,0.65)",
            default: "rgba(214, 215, 214, 0.65)"
          }
        ],
        marks: [
          {
            type: "polys",
            from: { data: "polys" },
            properties: {
              x: {
                field: "x",
                scale: "x"
              },
              y: {
                field: "y",
                scale: "y"
              },
              fillColor: {
                scale: "polys_fillColor",
                field: "color"
              },
              strokeColor: "black",
              strokeWidth: 5,
              lineJoin: "miter",
              miterLimit: 20
            }
          }
        ]
      })
    })
  })
})
