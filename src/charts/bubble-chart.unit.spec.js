import { expect } from "chai"
import bubbleChart from "./bubble-chart"

describe("Bubble Chart", () => {
  describe("constructor", () => {
    it("should create a bubble chart", () => {
      const node = window.document.createElement("DIV")
      const bar = bubbleChart(node)
      expect(bar.anchor()).to.equal(node)
    })
  })
})
