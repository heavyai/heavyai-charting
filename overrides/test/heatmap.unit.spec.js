import chai, {expect} from "chai"
import spies from "chai-spies"
import dc from "../../index"
import d3 from "d3"

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
      const key0 = [1, 10]
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
  describe("label functions", () => {
    let rowsLabel
    let colsLabel
    before(() => {
      rowsLabel = heat.rowsLabel()
      colsLabel = heat.colsLabel()
    })
    it("should return stringified Date", () => {
      const date = new Date()
      expect(rowsLabel(date)).to.equal(date.toString())
      expect(colsLabel(date)).to.equal(date.toString())
    })
    it("should return itself if not number", () => {
      const data = "STRING"
      expect(rowsLabel(data)).to.equal(data)
      expect(colsLabel(data)).to.equal(data)
    })
    it('should format numbers', () => {
      expect(rowsLabel(10000)).to.equal("10k")
      expect(rowsLabel(1)).to.equal(1)
      expect(colsLabel(10000)).to.equal("10k")
      expect(colsLabel(1)).to.equal(1)
    })
  })
})
