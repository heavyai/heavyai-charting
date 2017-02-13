import {expect} from "chai"
import * as dc from "../src"

describe("Heatmap Chart", () => {
  describe("constructor", () => {
    it('should create a heatmap chart', () => {
      const node = window.document.createElement("DIV")
      const heat = dc.heatMap(node)
      expect(heat.anchor()).to.equal(node)
    })
  })
})
