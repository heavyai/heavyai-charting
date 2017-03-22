import {expect} from "chai"
import dataTable from "./data-table"

describe("Data Table Chart", () => {
  describe("constructor", () => {
    it('should create a data table chart', () => {
      const node = window.document.createElement("DIV")
      const table = dataTable(node)
      expect(table.anchor()).to.equal(node)
    })
  })
})
