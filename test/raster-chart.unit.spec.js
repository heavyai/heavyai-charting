import {expect} from "chai"
import * as dc from "../src"

describe("Raster Chart", () => {
  describe("constructor", () => {
    it('should create a raster chart', () => {
      const mapboxAPI = {
        LngLatBounds: {
          convert: () => {}
        }
      }
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const raster = dc.rasterChart(node, false, null, mapboxAPI)
      expect(raster.anchor()).to.equal(node)
    })
  })
})
