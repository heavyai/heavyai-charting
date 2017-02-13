import {expect} from "chai"
import * as dc from "../src"

describe("Margin Mixin", () => {
  describe("constructor", () => {
    it('should mixin a margin chart', () => {
      dc.marginMixin({})
    })
  })
})
