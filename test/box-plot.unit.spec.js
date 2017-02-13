import {expect} from "chai"
import * as dc from "../src"

describe("Box Plot Chart", () => {
  describe("constructor", () => {
    it('should create a box plot chart', () => {
      const node = window.document.createElement("DIV")
      const box = dc.boxPlot(node)
      expect(box.anchor()).to.equal(node)
    })
  })
})
