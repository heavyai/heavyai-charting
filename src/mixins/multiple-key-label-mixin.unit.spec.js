import { expect } from "chai"
import multipleKeyLabelMixin from "./multiple-key-label-mixin"

describe("multipleKeyLabelMixin", () => {
  let chart

  beforeEach(() => {
    chart = {
      label: () => null
    }
  })

  describe("constructor", () => {
    it("should construct multipleKeyLabelMixin", () => {
      multipleKeyLabelMixin(chart)
    })
  })
})
