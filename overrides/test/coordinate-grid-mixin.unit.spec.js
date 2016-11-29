import chai, {expect} from "chai"
import dc from "../../mapdc"
import spies from "chai-spies"

chai.use(spies)

describe("coordinateGridMixin", () => {
  let chart
  beforeEach(() => {
    const label = "arr_timestamp"
    chart = dc.coordinateGridMixin({})
    chart.xAxisLabel = () => label
  })

  describe("popupTextAccessor", () => {
    it("should return the proper popup text", () => {
      const value = new Date( Date.UTC(2016, 9, 21) )
      const arr = [{datum: {data: {key0: [{value}]}}}]
      expect(chart.popupTextAccessor(arr)()).to.equal("Oct 21, 2016  00:00:00")
    })
  })

  describe("getNumTicksForXAxis", () => {
    beforeEach(() => {
      chart.x = () => ({
        domain: () => [1, 4]
      })
      chart.group = () => ({
        binParams: () => [{extract: true}]
      })
    })
    it("should handle extract case", () => {
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

  describe("Destroy Chart", () => {
    it("should not try and destroy range chart when range is not enabled", () => {
      chart.rangeChartEnabled = chai.spy(() => true)
      chart.destroyChart()
      expect(chart.rangeChartEnabled).to.be.called.with(false)
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
})
