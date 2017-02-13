import {expect} from "chai"
import * as dc from "../src"

describe("Bubble Mixin", () => {
  describe("constructor", () => {
    it('should create a chart', () => {
      dc.bubbleMixin({
        data: () => {},
        renderLabel: () => {},
        setDataAsync: () => {}
      })
    })
  })
})
