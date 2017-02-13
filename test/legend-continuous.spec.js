import {expect} from "chai"
import * as dc from "../src"

describe("Legend Continuous", () => {
  describe("constructor", () => {
    it('should create a continuous legeng', () => {
      const legend = dc.legendContinuous()
      expect(typeof legend.parent).to.equal("function")
    })
  })
})
