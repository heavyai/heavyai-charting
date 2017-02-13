import {expect} from "chai"
import * as dc from "../src"

describe("Base Mixin", () => {
  describe("constructor", () => {
    it('should mixin a base chart', () => {
      dc.baseMixin({})
    })
  })
})
