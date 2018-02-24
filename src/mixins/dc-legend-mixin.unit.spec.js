import chai, { expect } from "chai"
import spies from "chai-spies"
import dcLegendMixin from "./dc-legend-mixin"
import barChart from "../charts/bar-chart"
import legend from "../chart-addons/legend"

chai.use(spies)

describe("dc legend mixin", () => {
  let _legend
  let chart
  beforeEach(() => {
    const node = window.document.createElement("DIV")
    chart = barChart(node)
    _legend = chart.legend(dcLegendMixin(legend())).legend()
  })

  describe("legend remove", () => {
    it("should set the parent to node", () => {
      _legend.removeLegend()
      expect(chart.legend()).to.equal(null)
    })
  })

  describe("legend setTitle", () => {
    it("should set title of the legend", () => {
      const testTitle = "Test Title"
      _legend.setTitle(testTitle)
      expect(chart.legend()._title).to.equal(testTitle)
    })
  })

  describe("legend setKey", () => {
    it("should set key of the legend", () => {
      const testKey = "key0"
      _legend.setKey(testKey)
      expect(chart.legend()._key).to.equal(testKey)
    })
  })

  describe("legendables", () => {
    it("should create a correct set of legends", () => {
      const domain = ["test 1", "test 2", "test 3"]
      const range = ["red", "green", "blue"]
      const expectedResult = [
        {
          color: "test 1",
          name: 0,
          chart: chart
        },
        {
          color: "test 2",
          name: 1,
          chart: chart
        }
      ]
      chart.colors(domain, range)
      expect(chart.legend().legendables()).to.deep.equal(expectedResult)
    })
  })
})
