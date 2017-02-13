import {expect} from "chai"
import * as dc from "../src"

describe("Poly Raster Chart", () => {
  describe("constructor", () => {
    it('should create a poly raster chart', () => {
      const mapboxAPI = {
        LngLatBounds: {
          convert: () => {}
        }
      }
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const polyRaster = dc.polyRasterChart(node, false, null, mapboxAPI)
      expect(polyRaster.anchor()).to.equal(node)
    })
  })
})
