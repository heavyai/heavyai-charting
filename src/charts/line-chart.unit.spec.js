import { expect } from "chai"
import * as dc from "../index"

describe("Line Chart", () => {
  describe("constructor", () => {
    it("should create a line chart", () => {
      const node = window.document.createElement("DIV")
      const line = dc.lineChart(node)
      expect(line.anchor()).to.equal(node)
    })
  })
})
