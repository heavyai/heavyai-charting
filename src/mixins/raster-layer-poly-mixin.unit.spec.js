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
            aggregrate: "COUNT(*)",
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
    it("should generate the correct vega spec", () => {
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
            aggregrate: "AVG(contributions_donotmodify.amount)",
            domain: [0, 100],
            range: ["black", "blue"]
          }
        }
      })

      expect(
        layer.__genVega({
          table: "contribs",
          layerName: "polys",
          filter: "amount=0"
        })
      ).to.deep.equal({
        data: [
          {
            name: "polys",
            format: "polys",
            sql:
              "SELECT zipcodes.rowid, contributions_donotmodify.contributor_zipcode as key0, AVG(contributions_donotmodify.amount) as color FROM contributions_donotmodify, zipcodes WHERE (contributions_donotmodify.contributor_zipcode = zipcodes.ZCTA5CE10) AND (amount=0) GROUP BY zipcodes.rowid, key0 LIMIT 1000000"
          }
        ],
        scales: [
          {
            name: "polys_fillColor",
            type: "quantize",
            domain: [0, 100],
            range: ["black", "blue"],
            nullValue: "#D6D7D6",
            default: "#D6D7D6"
          }
        ],
        marks: [
          {
            type: "polys",
            from: { data: "polys" },
            properties: {
              x: {
                scale: "x",
                field: "x"
              },
              y: {
                scale: "y",
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
            }
          }
        ]
      })
    })
  })
})
