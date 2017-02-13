import {expect} from "chai"
import * as dc from "../src"

describe("Cloud Chart", () => {
  describe("constructor", () => {
    it('should create a cloud chart', () => {
      const node = window.document.createElement("DIV")
      const cloud = dc.cloudChart(node)
      expect(cloud.anchor()).to.equal(node)
    })
  })
})
