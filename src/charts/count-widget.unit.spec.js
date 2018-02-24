import { expect } from "chai"
import * as dc from "../index"

describe("Count Widget Chart", () => {
  describe("constructor", () => {
    it("should create a count widget", () => {
      const node = window.document.createElement("DIV")
      const count = dc.countWidget(node)
      expect(count.anchor()).to.equal(node)
    })
  })
})
