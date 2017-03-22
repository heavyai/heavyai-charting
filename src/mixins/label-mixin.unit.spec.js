import mixin from "./label-mixin"
import {expect} from "chai"


describe("laebl mixin", () => {
  describe("measureLabelsOn", () => {
    it('should set and get _measureLabelsOn', () => {
      const chart = mixin({})
      expect(chart.measureLabelsOn()).to.equal(false)
      chart.measureLabelsOn(true)
      expect(chart.measureLabelsOn()).to.equal(true)
    })
  })
})
