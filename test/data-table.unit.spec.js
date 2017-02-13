import {expect} from "chai"
import * as dc from "../src"

describe("Data Table Chart", () => {
  describe("constructor", () => {
    it('should create a data table chart', () => {
      const node = window.document.createElement("DIV")
      const table = dc.dataTable(node)
      expect(table.anchor()).to.equal(node)
    })
  })
})
