import {expect} from "chai"
import * as dc from "../src"
import mapboxglMock from "./mapbox-gl-mock"

describe("Poly Raster Chart", () => {
  describe("constructor", () => {
    it('should create a poly raster chart', () => {
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const polyRaster = dc.polyRasterChart(node, false, null, mapboxglMock, {})
      expect(polyRaster.anchor()).to.equal(node)
    })
  })
})
