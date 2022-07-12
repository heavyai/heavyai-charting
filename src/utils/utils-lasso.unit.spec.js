import {expect} from "chai"
import * as utils from "./utils-lasso"

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

    expect(utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
      "(UNLIKELY( lon >= -128.320313 AND lon <= -40.429688 AND lat >= -9.661713 AND lat <= 51.483925)) AND (ST_Contains('POLYGON ((-84.023438 51.483925, -40.429688 22.069062, -124.453125 -9.661713, -128.320313 29.958472, -84.023438 51.483925))', ST_Point(lon, lat)))"
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

    expect(utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
      "((ST_DWithin(CAST(ST_SetSRID(ST_Point(0, 0), 4326) as GEOGRAPHY), CAST(ST_SetSRID(ST_Point(lon, lat), 4326) as GEOGRAPHY), 1000000)))"
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

    expect(utils.convertGeojsonToSql(features, "lon", "lat")).to.equal(
      "(UNLIKELY( lon >= -128.320313 AND lon <= -40.429688 AND lat >= -9.661713 AND lat <= 51.483925)) AND ((ST_Contains('POLYGON ((-84.023438 51.483925, -40.429688 22.069062, -124.453125 -9.661713, -128.320313 29.958472, -84.023438 51.483925))', ST_Point(lon, lat))) OR (ST_DWithin(CAST(ST_SetSRID(ST_Point(0, 0), 4326) as GEOGRAPHY), CAST(ST_SetSRID(ST_Point(lon, lat), 4326) as GEOGRAPHY), 1000000)))"
    )
  })

})
