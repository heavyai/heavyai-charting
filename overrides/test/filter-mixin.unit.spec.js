import {expect} from "chai"
import FilterMixin from "../src/filter-mixin"
import dc from "../../index"

describe("Filter Mixin", () => {
  let chart
  before(() => {
    chart = FilterMixin(dc.baseMixin({}))
  })
  describe("hasFilterHandler", () => {
    it("should handler cases where second argument if array of object collections", () => {
      const range = [new Date("7/1/2009"), new Date("6/1/2010")]
      const filters = [range]
      const filter = [[{value: range[0]}, {value: range[1]}]]
      expect(chart.hasFilterHandler()(filters, filter))
    })
  })
})
