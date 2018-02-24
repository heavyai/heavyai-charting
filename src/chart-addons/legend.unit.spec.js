import { expect } from "chai"
import * as dc from "../index"

describe("Legend", () => {
  describe("constructor", () => {
    it("should create a legeng", () => {
      const legend = dc.legend()
      expect(typeof legend.render).to.equal("function")
    })
  })
})
