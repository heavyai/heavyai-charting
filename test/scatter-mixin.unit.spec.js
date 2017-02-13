import {expect} from "chai"
import * as dc from "../src"

describe("Scatter Mixin", () => {
  describe("constructor", () => {
    it('should mixin a scatter', () => {
      dc.scatterMixin({}, {})
    })
  })
})
