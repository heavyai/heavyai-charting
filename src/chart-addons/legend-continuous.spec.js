import { expect } from "chai"
import legendContinuous from "./legend-continuous"

describe("Legend Continuous", () => {
  describe("constructor", () => {
    it("should create a continuous legeng", () => {
      const legend = legendContinuous()
      expect(typeof legend.parent).to.equal("function")
    })
  })
})
