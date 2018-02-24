import { expect } from "chai"
import * as dc from "../index"

describe("Data Grid Chart", () => {
  describe("constructor", () => {
    it("should create a data grid chart", () => {
      const node = window.document.createElement("DIV")
      const grid = dc.dataGrid(node)
      expect(grid.anchor()).to.equal(node)
    })
  })
})
