import { expect } from "chai"
import cloudChart from "./cloud-chart"

describe("Cloud Chart", () => {
  describe("constructor", () => {
    it("should create a cloud chart", () => {
      const node = window.document.createElement("DIV")
      const cloud = cloudChart(node)
      expect(cloud.anchor()).to.equal(node)
    })
  })
})
