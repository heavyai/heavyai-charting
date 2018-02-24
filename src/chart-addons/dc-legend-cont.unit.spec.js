import chai, { expect } from "chai"
import spies from "chai-spies"
import dcLegendCont from "./dc-legend-cont"
import { d3, pieChart } from "../index"

chai.use(spies)

describe("dc legend cont", () => {
  let legend
  beforeEach(() => {
    legend = dcLegendCont()
  })
  describe("legend lock", () => {
    it("should instanciate the legend with it unlocked", () => {
      expect(legend.isLocked()).to.equal(false)
    })
    it("should set the legend to locked state", () => {
      legend.isLocked(true)
      expect(legend.isLocked()).to.equal(true)
    })
  })

  describe("legend parent", () => {
    it("should instanciate the legend with no parent", () => {
      expect(legend.parent()).to.equal(null)
    })
    it("should set the parent to node", () => {
      const node = window.document.createElement("DIV")
      const parent = {
        root: () => d3.select(node)
      }
      legend.parent(parent)
      expect(legend.parent()).to.equal(parent)
    })
  })

  describe("legend minMax", () => {
    it("should instanciate the legend with no minMax", () => {
      expect(legend.minMax()).to.equal(null)
    })
    it("should set the legend minMax to value", () => {
      legend.minMax([1, 1000])
      expect(legend.minMax()).to.deep.equal([1, 1000])
    })
  })

  describe("legend render", () => {
    it("should render legend without error", () => {
      const node = window.document.createElement("DIV")
      const parent = pieChart(node)
      legend.parent(parent)
      legend.render()
    })
  })

  describe("legendables continuous", () => {
    it("should return correct legend swatches, color and value", () => {
      const node = window.document.createElement("DIV")
      const parent = pieChart(node)
      parent.colors().domain([5.5, 15.75])
      parent.colors().range(["red", "blue", "green"])
      expect(parent.legendablesContinuous()).to.deep.equal([
        { color: "red", value: "5.5" },
        { color: "blue", value: "8.92" },
        { color: "green", value: "12.33" }
      ])
    })
    it("should round value of legendables for start value over 1000", () => {
      const node = window.document.createElement("DIV")
      const parent = pieChart(node)
      parent.colors().domain([1224.85, 1500.75])
      parent.colors().range(["red", "blue", "green"])
      expect(parent.legendablesContinuous()).to.deep.equal([
        { color: "red", value: "1,225" },
        { color: "blue", value: "1,317" },
        { color: "green", value: "1,409" }
      ])
    })
  })
})
