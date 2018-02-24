import chai, { expect } from "chai"
import spies from "chai-spies"
import * as dc from "../index"

chai.use(spies)

describe("Color Mixin", () => {
  describe("constructor", () => {
    it("should create a chart", () => {
      dc.colorMixin({})
    })
  })

  describe("getColor", () => {
    let chart

    beforeEach(() => {
      chart = dc.colorMixin({})
      chart.colorAccessor(() => {})
    })

    it("should return grey if data is undefined", () => {
      expect(chart.getColor()).to.equal("#e2e2e2")
    })
    it("should return the value of getColor", () => {
      expect(chart.getColor({}, 1)).to.equal("#3182bd")
    })
    it("should return the middle color range value if getColor is undefined", () => {
      const range = () => ["GREEN", "WHITE", "ORANGE"]
      chart.colors(() => {})
      chart.colors = () => ({ range })
      expect(chart.getColor({}, 1)).to.equal("WHITE")
    })
  })
})
