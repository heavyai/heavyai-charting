import { expect } from "chai"
import compositeChart from "./composite-chart"

describe("Composite Chart", () => {
  describe("constructor", () => {
    it("should create a composite chart", () => {
      const node = window.document.createElement("DIV")
      const composite = compositeChart(node)
      expect(composite.anchor()).to.equal(node)
    })
  })
})
