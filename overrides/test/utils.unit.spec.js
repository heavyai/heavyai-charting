import {expect} from "chai"
import dc from "../../index.js"

describe("DC Utils", () => {
  describe("extractTickFormat", () => {
    let timeBin = "auto"
    it("should handle year timeBin", () => {
      timeBin = "year"
      expect(dc.utils.extractTickFormat(timeBin)(2007.2)).to.equal(2008)
    })
    it("should handle isodow timeBin", () => {
      timeBin = "isodow"
      expect(dc.utils.extractTickFormat(timeBin)(1)).to.equal("Mon")
    })
    it("should handle month timeBin", () => {
      timeBin = "month"
      expect(dc.utils.extractTickFormat(timeBin)(2)).to.equal("Feb")
    })
    it("should handle quarter timeBin", () => {
      timeBin = "quarter"
      expect(dc.utils.extractTickFormat(timeBin)(4)).to.equal("Q4")
    })
    it("should handle hour timeBin", () => {
      timeBin = "hour"
      expect(dc.utils.extractTickFormat(timeBin)(0)).to.equal(1)
    })
    it("should handle minute timeBin", () => {
      timeBin = "minute"
      expect(dc.utils.extractTickFormat(timeBin)(59)).to.equal(60)
    })
    it("should handle default timeBin", () => {
      timeBin = "auto"
      expect(dc.utils.extractTickFormat(timeBin)(15)).to.equal(15)
    })
  })
})
