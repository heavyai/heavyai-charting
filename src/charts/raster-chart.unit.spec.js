import {expect} from "chai"
import * as dc from "../index"
import mapboxglMock from "../../test/mapbox-gl-mock"
import {toLegendState} from "./raster-chart"

describe("Raster Chart", () => {
  describe("constructor", () => {
    it('should create a raster chart', () => {
      const node = window.document.createElement("DIV")
      node.setAttribute('id', 'test')
      const raster = dc.rasterChart(node, false, null, mapboxglMock)
      expect(raster.anchor()).to.equal(node)
    })
  })


  describe("toLegendState helper", () => {
    it("should nominal", () => {
      expect(toLegendState([{
        type: "ordinal",
        domain: ["en", "pt", "es", "in", "und", "ja"],
        range: ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b"]
      }])).to.deep.equal({
        type: "nominal",
        title: "Legend",
        open: true,
        domain: ["en", "pt", "es", "in", "und", "ja"],
        range: ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b"]
      })
    })
    it("should gradient", () => {
      expect(toLegendState([{
        type: "quantitative",
        domain: [0, 100],
        range: ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b"],
        legend: {
          title: "My Legend"
        }
      }])).to.deep.equal({
        type: "gradient",
        title: "My Legend",
        open: true,
        domain: [0, 100],
        range: ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b"]
      })
    })
    it("should undefined", () => {

    })
    it("should stacked", () => {

    })
  })
})
