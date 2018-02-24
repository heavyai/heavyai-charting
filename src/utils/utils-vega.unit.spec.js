/* eslint-disable */

import * as VegaUtils from "./utils-vega"
import { expect } from "chai"

describe("Vega Utils", () => {
  describe("All Utils", () => {
    it("should have all the necessary exports", () => {
      expect(typeof VegaUtils.notNull).to.equal("function")
      expect(typeof VegaUtils.createVegaAttrMixin).to.equal("function")
      expect(typeof VegaUtils.createRasterLayerGetterSetter).to.equal(
        "function"
      )
    })
  })

  describe("notNull", () => {
    it("should return false if value is null", () => {
      expect(VegaUtils.notNull(undefined)).to.be.false
    })

    it("should return false when a value is undefined", () => {
      expect(VegaUtils.notNull(undefined)).to.be.false
    })

    it("should return value if value is within min and max", () => {
      expect(VegaUtils.notNull(0)).to.be.true
    })

    it("should return value if value is within min and max", () => {
      expect(VegaUtils.notNull(false)).to.be.true
    })

    it("should return value if value is within min and max", () => {
      expect(VegaUtils.notNull("null")).to.be.true
    })

    it("should return value if value is within min and max", () => {
      expect(VegaUtils.notNull(5)).to.be.true
    })
  })
})
