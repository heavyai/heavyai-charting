import chai, { expect } from "chai"
import spies from "chai-spies"
import d3 from "d3"
import * as dc from "../index"

chai.use(spies)

describe("MapD Heatmap Chart", () => {
  let heat
  beforeEach(() => {
    const node = window.document.createElement("DIV")
    heat = dc.heatMap(node)
  })

  describe("constructor", () => {
    it("should create a heatmap chart", () => {
      const node = window.document.createElement("DIV")
      const heat = dc.heatMap(node)
      expect(heat.anchor()).to.equal(node)
    })
  })

  describe("colorAccessor", () => {
    it("should return the value prop of data", () => {
      const colorAccessor = heat.colorAccessor()
      const value = "red"
      expect(colorAccessor({ value })).to.equal(value)
    })
  })
  describe("keyAccessor", () => {
    it("should return the first element of the key0 prop of data", () => {
      const keyAccessor = heat.keyAccessor()
      const key0 = [1, 10]
      expect(keyAccessor({ key0 })).to.equal(key0[0])
    })
  })
  describe("valueAccessor", () => {
    it("should return the key1 prop of data", () => {
      const valueAccessor = heat.valueAccessor()
      const key1 = "American Airlines"
      expect(valueAccessor({ key1 })).to.equal(key1)
    })
    it("should handle array case", () => {
      const valueAccessor = heat.valueAccessor()
      const key1 = [{ value: "Monday" }]
      expect(valueAccessor({ key1 })).to.deep.equal("Monday")
    })
  })
  describe("Y Axis ordering", () => {
    it("should sort object and string values in descending order", () => {
      let data = [{ key1: "American Airlines" }]
      expect(heat.shouldSortYAxisDescending(data)).to.equal(true)
      data = [{ key1: [{}, {}] }]
      expect(heat.shouldSortYAxisDescending(data)).to.equal(true)
    })
    it("should sort numeric values in ascending order", () => {
      let data = [{ key1: 12 }]
      expect(heat.shouldSortYAxisDescending(data)).to.equal(false)
      data = [{ key1: [12, 16] }]
      expect(heat.shouldSortYAxisDescending(data)).to.equal(false)
    })
  })
  describe("label functions", () => {
    let rowsLabel
    let colsLabel
    before(() => {
      rowsLabel = heat.rowsLabel()
      colsLabel = heat.colsLabel()
    })
    it("should properly format array data", () => {
      expect(rowsLabel([10000, 20000])).to.equal("10,000 \u2013 20,000")
      expect(colsLabel([10000, 20000])).to.equal("10,000 \u2013 20,000")
    })
    it("should return stringified Date", () => {
      const date = new Date(Date.UTC(2001, 0, 1))
      expect(rowsLabel(date)).to.equal("Jan 1, 2001  00:00:00")
      expect(colsLabel(date)).to.equal("Jan 1, 2001  00:00:00")
    })
    it("should return itself if not number", () => {
      const data = "STRING"
      expect(rowsLabel(data)).to.equal(data)
      expect(colsLabel(data)).to.equal(data)
    })
    it("should format numbers", () => {
      expect(rowsLabel(10000)).to.equal("10,000")
      expect(rowsLabel(1)).to.equal("1")
      expect(colsLabel(10000)).to.equal("10,000")
      expect(colsLabel(1)).to.equal("1")
    })
    it("should properly format extract data", () => {
      expect(
        rowsLabel([{ isExtract: true, value: 1, extractUnit: "month" }])
      ).to.equal("Jan")
      expect(
        rowsLabel([{ isExtract: true, value: 1, extractUnit: "hour" }])
      ).to.equal("1AM")
    })
  })
})
