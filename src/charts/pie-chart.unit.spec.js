import { expect } from "chai"
import * as dc from "../index"

describe("Pie Chart", () => {
  describe("constructor", () => {
    it("should create a pie chart", () => {
      const node = window.document.createElement("DIV")
      const pie = dc.pieChart(node)
      expect(pie.anchor()).to.equal(node)
    })
  })
})
