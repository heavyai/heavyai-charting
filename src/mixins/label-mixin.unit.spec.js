import mixin from "./label-mixin"
import { expect } from "chai"

describe("label mixin", () => {
  let chart

  beforeEach(() => {
    chart = {
      on: () => () => null
    }
    chart = mixin(chart)
  })
  describe("measureLabelsOn", () => {
    it("should set and get _measureLabelsOn", () => {
      expect(chart.measureLabelsOn()).to.equal(false)
      chart.measureLabelsOn(true)
      expect(chart.measureLabelsOn()).to.equal(true)
    })
  })
  describe("getContainerWidth", () => {
    it("should return correct container width", () => {
      chart.effectiveWidth = () => 180
      chart.effectiveHeight = () => 160
      expect(chart.getAxisLabelContainerWidth("x", false)).to.equal(180)
      expect(chart.getAxisLabelContainerWidth("x", true)).to.equal(180 - 32)
      expect(chart.getAxisLabelContainerWidth("y", false)).to.equal(160)
    })
  })
})
