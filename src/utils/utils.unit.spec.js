import {expect} from "chai"
import {utils, xAxisTickFormat} from "./utils"
import * as dc from "../index"


describe("DC Utils", () => {

  describe("All Utils", () => {
    it('should have all the necessary exports', () => {
      expect(typeof dc.printers.filters).to.equal("function")
      expect(typeof dc.printers.filter).to.equal("function")
      expect(typeof dc.pluck).to.equal("function")
      expect(typeof dc.utils.printSingleValue).to.equal("function")
      expect(typeof dc.utils.add).to.equal("function")
      expect(typeof dc.utils.subtract).to.equal("function")
      expect(typeof dc.utils.isNumber).to.equal("function")
      expect(typeof dc.utils.isFloat).to.equal("function")
      expect(typeof dc.utils.isInteger).to.equal("function")
      expect(typeof dc.utils.isNegligible).to.equal("function")
      expect(typeof dc.utils.clamp).to.equal("function")
      expect(typeof dc.utils.uniqueId).to.equal("function")
      expect(typeof dc.utils.nameToId).to.equal("function")
      expect(typeof dc.utils.appendOrSelect).to.equal("function")
      expect(typeof dc.utils.safeNumber).to.equal("function")
      expect(typeof dc.utils.b64toBlob).to.equal("function")
    })
  })

  describe("extractTickFormat", () => {
    let timeBin = "auto"
    it("should handle year timeBin", () => {
      timeBin = "year"
      expect(utils.extractTickFormat(timeBin)(2007.2)).to.equal(2008)
    })
    it("should handle isodow timeBin", () => {
      timeBin = "isodow"
      expect(utils.extractTickFormat(timeBin)(1)).to.equal("Mon")
    })
    it("should handle month timeBin", () => {
      timeBin = "month"
      expect(utils.extractTickFormat(timeBin)(2)).to.equal("Feb")
    })
    it("should handle quarter timeBin", () => {
      timeBin = "quarter"
      expect(utils.extractTickFormat(timeBin)(4)).to.equal("Q4")
    })
    it("should handle hour timeBin", () => {
      timeBin = "hour"
      expect(utils.extractTickFormat(timeBin)(0)).to.equal(1)
    })
    it("should handle minute timeBin", () => {
      timeBin = "minute"
      expect(utils.extractTickFormat(timeBin)(59)).to.equal(60)
    })
    it("should handle default timeBin", () => {
      timeBin = "auto"
      expect(utils.extractTickFormat(timeBin)(15)).to.equal(15)
    })
  })

  describe("xAxisTickFormat", () => {
    it("returns the correct format for extract", () => {
      const f = xAxisTickFormat({extract: true, timeBin: "year"})
      expect(f(1.5)).to.eq(2)
    })

    it("return the correct format function for chart that is time binned", () => {
      const f = xAxisTickFormat({}, true)
      expect(f(new Date("2016-11-30T08:00:00.000Z"))).to.eq("08 AM")

    })
  })
})
