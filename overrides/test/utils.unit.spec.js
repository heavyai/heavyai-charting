import {expect} from "chai"
import dc from "../../index.js"

describe("DC Utils", () => {
  describe("extractTickFormat", () => {
    let timeBin = "auto"
    it("should handle year timeBin", () => {
      timeBin = "year"
      expect(dc.utils.extractTickFormat(timeBin)(2007.2)).to.equal(2008)
    })
    it("should handle isodow timeBin", () => {
      timeBin = "isodow"
      expect(dc.utils.extractTickFormat(timeBin)(1)).to.equal("Mon")
    })
    it("should handle month timeBin", () => {
      timeBin = "month"
      expect(dc.utils.extractTickFormat(timeBin)(2)).to.equal("Feb")
    })
    it("should handle quarter timeBin", () => {
      timeBin = "quarter"
      expect(dc.utils.extractTickFormat(timeBin)(4)).to.equal("Q4")
    })
    it("should handle hour timeBin", () => {
      timeBin = "hour"
      expect(dc.utils.extractTickFormat(timeBin)(0)).to.equal(1)
    })
    it("should handle minute timeBin", () => {
      timeBin = "minute"
      expect(dc.utils.extractTickFormat(timeBin)(59)).to.equal(60)
    })
    it("should handle default timeBin", () => {
      timeBin = "auto"
      expect(dc.utils.extractTickFormat(timeBin)(15)).to.equal(15)
    })
  })

  describe("convertGeojsonToSql", () => {
    it('should handle polygons', () => {
      const features = [
        {
          "id": "277994aececf1a182a91fb5d64029a7a",
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  -84.023438,
                  51.483925
                ],
                [
                  -40.429688,
                  22.069062
                ],
                [
                  -124.453125,
                  -9.661713
                ],
                [
                  -128.320313,
                  29.958472
                ],
                [
                  -84.023438,
                  51.483925
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]

      expect(dc.utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
        "(UNLIKELY( lon >= -128.320313 AND lon <= -40.429688 AND lat >= -9.661713 AND lat <= 51.483925)) AND (lon IS NOT NULL AND lat IS NOT NULL AND (((((lon)-(-84.023438))*((22.069062)-(51.483925)) - ((-40.429688)-(-84.023438))*((lat)-(51.483925)) < 0.0) = (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0))) AND (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0) = (((lon)-(-40.429688))*((29.958472)-(22.069062)) - ((-128.320313)-(-40.429688))*((lat)-(22.069062)) < 0.0) OR (((((lon)-(-124.453125))*((29.958472)-(-9.661713)) - ((-128.320313)-(-124.453125))*((lat)-(-9.661713)) < 0.0) = (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0))) AND (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0) = (((lon)-(-128.320313))*((22.069062)-(29.958472)) - ((-40.429688)-(-128.320313))*((lat)-(29.958472)) < 0.0 OR (lat/2 = 0)))"
      )
    })

    it('should handle circles', () => {
      const features = [
        {
          "id": "277994aececf1a182a91fb5d64029a7a",
          "type": "Feature",
          "properties": {
            circle: true
          },
          "geometry": {
            "coordinates": [],
            center: [0, 0],
            radius: 1000,
            "type": "Polygon"
          }
        }
      ]

      expect(dc.utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
        "(DISTANCE_IN_METERS(0, 0, lon, lat) < 1000000)"
      )
    })

    it('should handle circles and polygons', () => {
      const features = [
        {
          "id": "277994aececf1a182a91fb5d64029a7a",
          "type": "Feature",
          "properties": {
            circle: true
          },
          "geometry": {
            "coordinates": [
              [
                [
                  -84.023438,
                  51.483925
                ],
                [
                  -40.429688,
                  22.069062
                ],
                [
                  -124.453125,
                  -9.661713
                ],
                [
                  -128.320313,
                  29.958472
                ],
                [
                  -84.023438,
                  51.483925
                ]
              ]
            ],
            center: [0, 0],
            radius: 1000,
            "type": "Polygon"
          }
        },
        {
          "id": "277994aececf1a182a91fb5d64029a7a",
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  -84.023438,
                  51.483925
                ],
                [
                  -40.429688,
                  22.069062
                ],
                [
                  -124.453125,
                  -9.661713
                ],
                [
                  -128.320313,
                  29.958472
                ],
                [
                  -84.023438,
                  51.483925
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]

      expect(dc.utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
        "(UNLIKELY( lon >= -128.320313 AND lon <= -40.429688 AND lat >= -9.661713 AND lat <= 51.483925)) AND (lon IS NOT NULL AND lat IS NOT NULL AND (((((lon)-(-84.023438))*((22.069062)-(51.483925)) - ((-40.429688)-(-84.023438))*((lat)-(51.483925)) < 0.0) = (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0))) AND (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0) = (((lon)-(-40.429688))*((29.958472)-(22.069062)) - ((-128.320313)-(-40.429688))*((lat)-(22.069062)) < 0.0) OR (((((lon)-(-124.453125))*((29.958472)-(-9.661713)) - ((-128.320313)-(-124.453125))*((lat)-(-9.661713)) < 0.0) = (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0))) AND (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0) = (((lon)-(-128.320313))*((22.069062)-(29.958472)) - ((-40.429688)-(-128.320313))*((lat)-(29.958472)) < 0.0 OR (lat/2 = 0))) OR (DISTANCE_IN_METERS(0, 0, lon, lat) < 1000000)"

      )
    })

  })
})
