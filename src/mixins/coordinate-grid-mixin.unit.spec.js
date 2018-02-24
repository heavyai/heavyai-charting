import chai, { expect } from "chai"
import coordinateGridMixin from "./coordinate-grid-mixin"
import spies from "chai-spies"

chai.use(spies)

describe("coordinateGridMixin", () => {
  let chart
  beforeEach(() => {
    const label = "arr_timestamp"
    chart = coordinateGridMixin({})
    chart.xAxisLabel = () => label
  })

  describe("popupTextAccessor", () => {
    it("should return the proper popup text", () => {
      const value = new Date(Date.UTC(2016, 9, 21))
      const arr = [{ datum: { data: { key0: [{ value }] } } }]
      expect(chart.popupTextAccessor(arr)()).to.equal("Oct 21, 2016  00:00:00")
    })
  })

  describe("getNumTicksForXAxis", () => {
    beforeEach(() => {
      chart.x = () => ({
        domain: () => [1, 4]
      })
      chart.group = () => ({
        binParams: () => [{ extract: true }]
      })
    })
    it("should handle extract case", () => {
      expect(chart.getNumTicksForXAxis()).to.equal(3)
    })
    it("should handle non-extract case", () => {
      chart.group = () => ({
        binParams: () => [{ extract: false }]
      })
      chart.effectiveWidth = () => 50
      chart.xAxis = () => ({
        scale: () => ({
          ticks: () => 10
        })
      })
      expect(chart.getNumTicksForXAxis()).to.equal(10)
    })
  })

  describe("Range Focused", () => {
    it("should set range focused", () => {
      chart.rangeFocused(true)
      expect(chart.rangeFocused()).to.equal(true)
    })
  })

  describe("Range Focused", () => {
    it("should set range focused", () => {
      chart.rangeFocused(true)
      expect(chart.rangeFocused()).to.equal(true)
    })
  })

  describe("Range Input", () => {
    it("should set range input", () => {
      chart.rangeInput(true)
      expect(chart.rangeInput()).to.equal(true)
    })
  })

  describe("Bin Input", () => {
    it("should set bin input", () => {
      chart.binInput(true)
      expect(chart.binInput()).to.equal(true)
    })
  })

  describe("rescale method", () => {
    it("should set _resizing to be true", () => {
      expect(chart.rescale().resizing()).to.equal(true)
    })
  })

  describe("rangeChart method", () => {
    it("should", () => {
      const range = coordinateGridMixin({})
      chart.rangeChart(range)
      expect(chart.rangeChart()).to.equal(range)
      expect(range.focusChart()).to.equal(chart)
    })
  })

  describe("zoomScale method", () => {
    it("should", () => {
      const extent = [0, 100]
      expect(chart.zoomScale(extent)).to.equal(chart)
      expect(chart.zoomScale()).to.equal(extent)
    })
  })

  describe("mouseZoomable method", () => {
    it("should set and get mouseZoomable", () => {
      chart.mouseZoomable(true)
      expect(chart.mouseZoomable()).to.equal(true)
    })
  })
})
