
import {expect} from "chai"
import dc from "../../mapdc"
import {redrawAllAsync} from "../src/core"

describe("Core Overrides", () => {
  describe("redrawAllAsync", () => {
    before(() => {
      dc._refreshDisabled = false
    })
    it("should return if dc refresh is disabled", () => {
      dc._refreshDisabled = true
      expect(redrawAllAsync()).to.equal(undefined)
    })
  })
})
