import {expect} from "chai"
import mapdTable from "../src/mapd-table"
import dc from "../../mapdc"

describe("MapD Table", () => {
  let tableChart
  before(() => {
    const node = window.document.createElement("DIV")
    tableChart = mapdTable(node)
  })
  it("should return a chart that has all the properties of a base mixin chart", () => {
    const baseProperties = Object.keys(dc.baseMixin({}))
    expect(baseProperties.reduce((truthy, prop) => {
      return tableChart.hasOwnProperty(prop) && truthy
    }, true)).to.equal(true)
  })
})
