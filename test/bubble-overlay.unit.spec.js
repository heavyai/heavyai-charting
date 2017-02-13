import {expect} from "chai"
import * as dc from "../src"

describe("Bubble Overlay", () => {
  describe("constructor", () => {
    it('should create a bubble overlay', () => {
      const node = window.document.createElement("DIV")
      const bubble = dc.bubbleOverlay(node)
      expect(bubble.anchor()).to.equal(node)
    })
  })
})
