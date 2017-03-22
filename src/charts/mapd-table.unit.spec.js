import {expect} from "chai"
import * as dc from "../index"

describe("MapD Table Chart", () => {
  describe("constructor", () => {
    it('should create a MapD Table chart', () => {
      const node = window.document.createElement("DIV")
      const number = dc.mapdTable(node)
      expect(number.anchor()).to.equal(node)
    })
  })
})
