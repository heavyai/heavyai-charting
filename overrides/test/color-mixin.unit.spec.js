import chai, {expect} from "chai"
import spies from "chai-spies"
import colorMixin from "../src/color-mixin"

describe("colorMixin", () => {
  const color = "BLUE"
  const range = () => ["GREEN", "WHITE", "ORANGE"]
  const getColor = chai.spy(() => "BLUE")
  const colors = () => ({ range })
  let chart

  beforeEach(() => chart = colorMixin({ getColor, colors }))

  describe("getColor", () => {
    it("should return grey if data is undefined", () => {
      expect(chart.getColor()).to.equal("#e2e2e2")
    })
    it("should return the value of getColor", () => {
      const d = {}
      const i = 1
      expect(chart.getColor(d, i)).to.equal("BLUE")
    })
    it("should return the middle color range value if getColor is undefined", () => {
      chart = colorMixin({ getColor: () => undefined, colors })
      expect(chart.getColor({}, 1)).to.equal("WHITE")
    })
  })
})
