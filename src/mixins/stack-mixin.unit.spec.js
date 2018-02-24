import { expect } from "chai"
import * as dc from "../index"

describe("Stack Mixin", () => {
  describe("constructor", () => {
    it("should mixin a stack chart", () => {
      dc.stackMixin(dc.colorMixin(dc.baseMixin({})))
    })
  })
})
