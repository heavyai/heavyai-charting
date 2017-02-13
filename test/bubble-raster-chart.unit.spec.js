import {expect} from "chai"
import * as dc from "../src"

describe("Bubble Raster Chart", () => {
  describe("constructor", () => {
    it('should create a bubble raster chart', () => {
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const bubbleRaster = dc.bubbleRasterChart(node, false, null, {})
      expect(bubbleRaster.anchor()).to.equal(node)
    })
  })
})
