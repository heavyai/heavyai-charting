import {expect} from "chai"
import dc from "../../mapdc"

describe("coordinateGridMixin", () => {
  const label = "arr_timestamp"
  const chart = dc.coordinateGridMixin({})
  chart.xAxisLabel = () => label

  describe("popupTextAccessor", () => {
    it("should return the proper popup text", () => {
      const alias = "July 2012"
      const arr = [{datum: {data: {key0: [{alias}]}}}]
      expect(chart.popupTextAccessor(arr)()).to.equal(label + ' ' + alias)
    })
  })

  describe("getNumTicksForXAxis", () => {
    it("should handle extract case", () => {
      chart.x = () => ({
        domain: () => [1, 4]
      })
      chart.group = () => ({
        binParams: () => [{extract: true}]
      })
      expect(chart.getNumTicksForXAxis()).to.equal(3)
    })
    it("should handle non-extract case", () => {
      chart.group = () => ({
        binParams: () => [{extract: false}]
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
})
