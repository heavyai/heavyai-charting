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
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo"
        }
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
            geocolumn: "mapd_geo",
            sql:
              "SELECT contributions_donotmodify.contributor_zipcode as key0, AVG(contributions_donotmodify.amount) as color, LAST_SAMPLE(zipcodes.rowid) as rowid FROM contributions_donotmodify, zipcodes WHERE (contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10) AND (amount=0) GROUP BY key0 LIMIT 1000000"
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214, 215, 214, 0.65)",
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
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo"
        }
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
            geocolumn: "mapd_geo",
            sql:
              "SELECT contributions_donotmodify.contributor_zipcode as key0, AVG(contributions_donotmodify.amount) as color, LAST_SAMPLE(zipcodes.rowid) as rowid FROM contributions_donotmodify, zipcodes WHERE (contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10) AND (amount=0) GROUP BY key0 LIMIT 1000000"
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214, 215, 214, 0.65)",
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
            domain: [0, 100],
            range: ["black", "blue"]
          },
          geocol: "mapd_geo"
        }
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
            geocolumn: "mapd_geo",
            sql:
              "SELECT contributions_donotmodify.contributor_zipcode as key0, AVG(contributions_donotmodify.amount) as color, LAST_SAMPLE(zipcodes.rowid) as rowid FROM contributions_donotmodify, zipcodes WHERE (contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10) AND (amount=0) GROUP BY key0 LIMIT 1000000"
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "rgba(214, 215, 214, 0.65)",
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
          geocol: "mapd_geo"
        }
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
            geocolumn: "mapd_geo",
            format: "polys",
            geocolumn: "mapd_geo",
            sql:
              "SELECT contributions_donotmodify.contributor_zipcode as key0, AVG(contributions_donotmodify.amount) as color, LAST_SAMPLE(zipcodes.rowid) as rowid FROM contributions_donotmodify, zipcodes WHERE (contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10) AND (amount=0) GROUP BY key0 LIMIT 1000000"
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
            nullValue: "rgba(214, 215, 214, 0.65)",
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
