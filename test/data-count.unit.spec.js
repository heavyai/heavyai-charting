import {expect} from "chai"
import * as dc from "../src"

describe("Data Count Chart", () => {
  describe("constructor", () => {
    it('should create a data count chart', () => {
      const node = window.document.createElement("DIV")
      const count = dc.dataCount(node)
      expect(count.anchor()).to.equal(node)
    })
  })
})
