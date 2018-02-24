/* eslint-disable max-nested-callbacks*/

import * as dc from "../index"
import { utils, xAxisTickFormat } from "./utils"
import { expect } from "chai"

describe("DC Utils", () => {
  describe("All Utils", () => {
    it("should have all the necessary exports", () => {
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
      const f = xAxisTickFormat({ extract: true, timeBin: "year" })
      expect(f(1.5)).to.eq(2)
    })

    it("return the correct format function for chart that is time binned", () => {
      const f = xAxisTickFormat({}, true)
      expect(f(new Date("2016-11-30T08:00:00.000Z"))).to.eq("08 AM")
    })
  })

  describe("clamp", () => {
    it("should return max if value is greater than max", () => {
      expect(dc.utils.clamp(8, 1, 7)).to.equal(7)
    })

    it("should return min if value is lower than min", () => {
      expect(dc.utils.clamp(0, 1, 7)).to.equal(1)
    })

    it("should return value if value is within min and max", () => {
      expect(dc.utils.clamp(5, 1, 7)).to.equal(5)
    })
  })

  describe("nullsLast", () => {
    const nullsLast = dc.utils.nullsLast()

    it("should return a sorting function", () => {
      expect(typeof nullsLast).to.equal("function")
    })

    it("should place null values at the end of array", () => {
      expect([null, 1].sort(dc.utils.nullsLast())).to.deep.equal([1, null])
    })

    it("should place null values at the end of array", () => {
      expect([null, 1, null].sort(dc.utils.nullsLast())).to.deep.equal([
        1,
        null,
        null
      ])
    })
  })

  describe("nullsFirst", () => {
    const nullsFirst = dc.utils.nullsFirst()

    it("should return a sorting function", () => {
      expect(typeof nullsFirst).to.equal("function")
    })

    it("should place null values at the start of array", () => {
      expect([1, null].sort(dc.utils.nullsFirst())).to.deep.equal([null, 1])
    })

    it("should place null values at the start of array", () => {
      expect([null, 1, null].sort(dc.utils.nullsFirst())).to.deep.equal([
        null,
        null,
        1
      ])
    })
  })

  describe("add", () => {
    it("should add first two params under non-date condition", () => {
      expect(dc.utils.add(10, 80, null)).to.equal(90)
    })

    it("should parse string and add it to a percentage of last param", () => {
      expect(dc.utils.add(10, "80%", 10)).to.equal(18)
    })

    it("should bypass string parsing and add it to a percentage of last param", () => {
      expect(dc.utils.add(10, "80", 10)).to.equal(18)
    })
  })

  describe("subtract", () => {
    it("should subtract first two params under non-date condition", () => {
      expect(dc.utils.subtract(80, 10, null)).to.equal(70)
    })

    it("should parse string and subtract it from a percentage of last param", () => {
      expect(dc.utils.subtract(10, "80%", 10)).to.equal(2)
    })

    it("should bypass string parsing and subtract it to a percentage of last param", () => {
      expect(dc.utils.subtract(10, "80", 10)).to.equal(2)
    })
  })

  describe("isOrdinal", () => {
    it("should return true when passed a valid option", () => {
      expect(dc.utils.isOrdinal("text")).to.be.true
    })

    it("should return false when passed an invalid option", () => {
      expect(dc.utils.isOrdinal("INT")).to.be.false
    })
  })

  describe("isQuantitative", () => {
    it("should return true when passed a valid option", () => {
      expect(dc.utils.isQuantitative("INT")).to.be.true
    })

    it("should return false when passed an invalid option", () => {
      expect(dc.utils.isQuantitative("text")).to.be.false
    })
  })

  describe("isNegligible", () => {
    it("should return true when passed a non-numeric value", () => {
      expect(dc.utils.isNegligible("INT")).to.be.true
    })

    it("should return false when passed a non-negligible number", () => {
      expect(dc.utils.isNegligible(10)).to.be.false
    })
  })

  describe("isNumber", () => {
    it("should return true for integers", () => {
      expect(dc.utils.isNumber(10)).to.be.true
    })

    it("should return true for floats", () => {
      expect(dc.utils.isNumber(10.25)).to.be.true
    })

    it("should return true for negative numbers", () => {
      expect(dc.utils.isNumber(-10)).to.be.true
    })

    it("should return false for a string", () => {
      expect(dc.utils.isNumber("10")).to.be.false
    })
  })

  describe("isFloat", () => {
    it("should return false for integers", () => {
      expect(dc.utils.isFloat(10)).to.be.false
    })

    it("should return true for floats", () => {
      expect(dc.utils.isFloat(10.25)).to.be.true
    })

    it("should return true for negative floats", () => {
      expect(dc.utils.isFloat(-10.25)).to.be.true
    })

    it("should return false for a string", () => {
      expect(dc.utils.isFloat("10")).to.be.false
    })
  })

  describe("isInteger", () => {
    it("should return true for integers", () => {
      expect(dc.utils.isInteger(10)).to.be.true
    })

    it("should return false for floats", () => {
      expect(dc.utils.isInteger(10.25)).to.be.false
    })

    it("should return true for negative integers", () => {
      expect(dc.utils.isInteger(10)).to.be.true
    })

    it("should return false for a string", () => {
      expect(dc.utils.isInteger("10")).to.be.false
    })
  })
})
