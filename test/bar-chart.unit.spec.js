console.log(__dirname)

import {expect} from "chai"
import * as dc from "../src"

describe("Bar Chart", () => {
  describe("constructor", () => {
    it('should create a bar chart', () => {
      const node = window.document.createElement("DIV")
      const bar = dc.barChart(node)
      expect(bar.anchor()).to.equal(node)
    })
  })
})
