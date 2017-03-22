import {expect} from "chai"
import bubbleRasterChart from "./bubble-raster-chart"
import mapboxglMock from "../../test/mapbox-gl-mock"

describe("Bubble Raster Chart", () => {
  describe("constructor", () => {
    it('should create a bubble raster chart', () => {
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const bubbleRaster = bubbleRasterChart(node, false, null, mapboxglMock)
      expect(bubbleRaster.anchor()).to.equal(node)
    })
  })
})
