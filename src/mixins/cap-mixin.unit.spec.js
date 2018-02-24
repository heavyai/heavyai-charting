import { expect } from "chai"
import * as dc from "../index"

describe("Cap Mixin", () => {
  describe("constructor", () => {
    it("should create a chart", () => {
      dc.capMixin({
        data: () => {},
        renderLabel: () => {},
        setDataAsync: () => {},
        _mandatoryAttributes: () => []
      })
    })
  })
})
