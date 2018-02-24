import { expect } from "chai"
import * as dc from "../index"

describe("Scatter Plot Chart", () => {
  describe("constructor", () => {
    it("should create a scatter plot chart", () => {
      const node = window.document.createElement("DIV")
      const scatter = dc.scatterPlot(node)
      expect(scatter.anchor()).to.equal(node)
    })
  })
})
