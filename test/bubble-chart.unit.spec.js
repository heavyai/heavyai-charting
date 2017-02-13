import {expect} from "chai"
import * as dc from "../src"

describe("Bubble Chart", () => {
  describe("constructor", () => {
    it('should create a bubble chart', () => {
      const node = window.document.createElement("DIV")
      const bar = dc.bubbleChart(node)
      expect(bar.anchor()).to.equal(node)
    })
  })
})
