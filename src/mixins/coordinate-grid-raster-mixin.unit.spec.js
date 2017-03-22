import {expect} from "chai"
import coordinateGridRasterMixin from "./coordinate-grid-raster-mixin"

describe("coordinateGridRasterMixin", () => {
  let chart
  
  beforeEach(()=>{
    chart = {}
  })
  
  describe("constructor", () => {
    it('should construct Coordinate Grid Raster Mixin', () => {
      coordinateGridRasterMixin(chart)
    })
  })
})
