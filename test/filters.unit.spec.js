import {expect} from "chai"
import * as dc from "../src"

describe("Filters", () => {
  it('should have all the necessary exports', () => {
    expect(typeof dc.filters.RangedFilter).to.equal("function")
    expect(typeof dc.filters.TwoDimensionalFilter).to.equal("function")
    expect(typeof dc.filters.RangedTwoDimensionalFilter).to.equal("function")
  })
})
