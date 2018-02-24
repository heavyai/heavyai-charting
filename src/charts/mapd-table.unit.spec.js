import { expect } from "chai"
import * as dc from "../index"
import { splitStrOnLastAs } from "./mapd-table"

describe("MapD Table Chart", () => {
  describe("constructor", () => {
    it("should create a MapD Table chart", () => {
      const node = window.document.createElement("DIV")
      const number = dc.mapdTable(node)
      expect(number.anchor()).to.equal(node)
    })
  })
  describe("splitStrOnLastAs", () => {
    it("should properly split on last AS within SQL statement", () => {
      const sqlStatement =
        "cast(SUM(CASE WHEN Shot_result = 'made' THEN 1 ELSE 0 END) as float)/(cast(SUM(CASE WHEN Shot_result = 'missed' THEN 1 ELSE 0 END) as float) + cast(SUM(CASE WHEN Shot_result = 'made' THEN 1 ELSE 0 END) as float)) as col3"
      const result = splitStrOnLastAs(sqlStatement)
      expect(result).to.deep.equal([
        "cast(SUM(CASE WHEN Shot_result = 'made' THEN 1 ELSE 0 END) as float)/(cast(SUM(CASE WHEN Shot_result = 'missed' THEN 1 ELSE 0 END) as float) + cast(SUM(CASE WHEN Shot_result = 'made' THEN 1 ELSE 0 END) as float))",
        "col3"
      ])
    })
  })
  describe("Nulls Order", () => {
    it("should return nullsOrder", () => {
      const node = window.document.createElement("DIV")
      const tableChart = dc.mapdTable(node)
      tableChart.nullsOrder(" NULLS LAST")
      expect(tableChart.nullsOrder()).to.equal(" NULLS LAST")
    })
  })
})
