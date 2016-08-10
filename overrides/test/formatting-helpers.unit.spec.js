import {expect} from "chai"
import * as Helpers from "../src/formatting-helpers"

describe("Formatting Helpers", () => {
  describe("isPlainObject", () => {
    it("should return false for non-objects", () => {
      expect(Helpers.isPlainObject(1)).to.equal(false)
    })
    it("should return false for date objects", () => {
      expect(Helpers.isPlainObject(new Date())).to.equal(false)
    })
    it("should return true for plain objects", () => {
      expect(Helpers.isPlainObject({})).to.equal(true)
    })
  })
  describe("hasAllObjects", () => {
    it("should return true when all items are objects in array", () => {
      expect(Helpers.hasAllObjects([{}, {}])).to.equal(true)
    })
    it("should return false when all items are not objects in array", () => {
      expect(Helpers.hasAllObjects([1, 1])).to.equal(false)
    })
  })
  describe("isArrayOfObjects", () => {
    it("should return true when all items are objects in array", () => {
      expect(Helpers.isArrayOfObjects([{}, {}])).to.equal(true)
    })
    it("should return false when all items are not objects in array", () => {
      expect(Helpers.isArrayOfObjects(1)).to.equal(false)
    })
  })
  describe("normalizeArray", () => {
    it("should map value property of a collection object", () => {
      expect(Helpers.normalizeArray([{value: 1}, {value: 2}])).to.deep.equal([1,2])
    })
    it("should return the collection if it isn't a collection of objects", () => {
      const collection = [new Date(1), new Date(2)]
      expect(Helpers.normalizeArray(collection)).to.deep.equal([new Date(1), new Date(2)])
    })
  })
  describe("formatNumber", () => {
    it("should format large numbers", () => {
      expect(Helpers.formatNumber(10000)).to.equal("10k")
    })
    it("should round decimenals", () => {
      expect(Helpers.formatNumber(3.33333)).to.equal(3.33)
    })
  })
  describe("formatValue", () => {
    it("should format large numbers", () => {
      expect(Helpers.formatValue(10000)).to.equal("10,000")
    })
    it("should format dates", () => {
      expect(Helpers.formatValue(new Date("1/1/2001"))).to.equal('Jan 01, 2001 · 08:00AM')
    })
    it("should format strings", () => {
      expect(Helpers.formatValue("TEST")).to.equal("TEST")
    })
  })
  describe("formatResultKey", () => {
    it("should format results with object collections", () => {
      expect(Helpers.formatResultKey([{alias: 'July'}, {alias: 'August'}])).to.equal('July  \u2013  August')
    })
    it("should format results with non-object collections", () => {
      expect(Helpers.formatResultKey([10000, 20000])).to.equal('10k  \u2013  20k')
    })
    it("shoud format other formats", () => {
      expect(Helpers.formatResultKey('ATL')).to.equal('ATL')
    })
  })
})
