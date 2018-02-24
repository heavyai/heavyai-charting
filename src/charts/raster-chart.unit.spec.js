import { expect } from "chai"
import * as dc from "../index"
import mapboxglMock from "../../test/mapbox-gl-mock"

describe("Raster Chart", () => {
  describe("constructor", () => {
    it("should create a raster chart", () => {
      const node = window.document.createElement("DIV")
      node.setAttribute("id", "test")
      const raster = dc.rasterChart(node, false, null, mapboxglMock)
      expect(raster.anchor()).to.equal(node)
    })
  })
})
