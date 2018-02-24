import { expect } from "chai"
import * as dc from "../index"

describe("Bubble Mixin", () => {
  describe("constructor", () => {
    it("should create a chart", () => {
      dc.bubbleMixin({
        data: () => {},
        renderLabel: () => {},
        setDataAsync: () => {}
      })
    })
  })
})
