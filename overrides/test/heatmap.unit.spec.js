import chai, {expect} from "chai"
import spies from "chai-spies"
import dc from "../../index"

chai.use(spies)

describe("MapD Heatmap Chart", () => {
  let heat
  beforeEach(() => {
    const node = window.document.createElement("DIV")
    heat = dc.heatMap(node)
  })
  describe("colorAccessor", () => {
    it('should return the value prop of data', () => {
      const colorAccessor = heat.colorAccessor()
      const value = "red"
      expect(colorAccessor({ value })).to.equal(value)
    })
  })
  describe("keyAccessor", () => {
    it('should return the first element of the key0 prop of data', () => {
      const keyAccessor = heat.keyAccessor()
      const key0 = [1,10]
      expect(keyAccessor({ key0 })).to.equal(key0[0])
    })
  })
  describe("valueAccessor", () => {
    it('should return the key1 prop of data', () => {
      const valueAccessor = heat.valueAccessor()
      const key1 = "American Airlines"
      expect(valueAccessor({ key1 })).to.equal(key1)
    })
  })
})
