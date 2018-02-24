import { expect } from "chai"
import asyncMixin from "./async-mixin"

describe("Async Mixin", () => {
  let chart

  beforeEach(() => {
    chart = {
      on: () => () => null,
      data: () => null
    }
  })

  describe("constructor", () => {
    it("should construct async", () => {
      asyncMixin(chart)
    })
  })
})
