import {expect} from "chai"
import * as dc from "../src"

describe("Composite Chart", () => {
  describe("constructor", () => {
    it('should create a composite chart', () => {
      const node = window.document.createElement("DIV")
      const composite = dc.compositeChart(node)
      expect(composite.anchor()).to.equal(node)
    })
  })
})
