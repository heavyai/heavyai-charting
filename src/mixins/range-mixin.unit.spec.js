import chai, {expect} from "chai"
import rangeMixin, {calcChartHeightWithMaxRangeChartHeight, calcMaxRangeChartHeight, DEFAULT_CHART_MARGINS_W_RANGE, MAX_RANGE_HEIGHT_IN_PX} from "./range-mixin"
import baseMixin from "./base-mixin"
import marginMixin from "./margin-mixin"
import spies from "chai-spies"

chai.use(spies)

describe("Range Chart", () => {
  let chart
  let baseNode
  let node
  beforeEach(() => {
    baseNode = window.document.createElement("DIV")
    node = window.document.createElement("DIV")
    baseNode.appendChild(node)
    const base = baseMixin(marginMixin({}))
    base.plotData = chai.spy()
    base.width = chai.spy()
    base.height = chai.spy()
    base.xAxisLabel = chai.spy()
    base.renderHorizontalGridLines = chai.spy()

    chart = rangeMixin(base)
    chart.xAxisMin = chai.spy()
    chart.xAxisMax = chai.spy()
    chart.colorAccessor = chai.spy()
    chart.colors = chai.spy()
    chart.isMulti = chai.spy()
    chart.renderArea = chai.spy()
    chart.elasticX = chai.spy()
    chart.rangeChartDiv = window.document.createElement("DIV")
    chart.rangeChartDiv.remove = () => { chart.rangeChartDiv = null }
    chart.rangeChart = () => chart
    chart.anchor = () => node
    chart.series = () => ({
      selected: chai.spy()
    })
    chart.group = () => ({
      binParams: () => [{
        binBounds: [2, 300]
      }],
      reduceMulti: () => chart.group()
    })
    chart.dimension = () => ({
      group: chart.group,
      value: () => []
    })
    chart.showOther = () => true
  })

  describe("Create Range Chart", () => {
    xit("rangeChart should not exist", () => {
      chart.plotData()
      expect(chart.rangeChartEnabled()).to.equal(false)
      expect(node._childNodes.length).to.equal(0)
    })

    xit("rangeChart should be created and appended to DOM", () => {
      chart.rangeChartEnabled(true)
      chart.plotData()
      expect(node._childNodes.length).to.equal(1)
    })

    it("set up rangeChart with default margins", () => {
      chart.rangeChartEnabled(true)
      chart.plotData()
      expect(chart.margins()).to.deep.equal(DEFAULT_CHART_MARGINS_W_RANGE)
    })
  })

  describe("Destroy Range Chart", () => {
    it("rangeChart should be removed", () => {
      chart.rangeChartEnabled(true)
      chart.plotData()
      expect(chart._rangeChartCreated).to.equal(true)
      chart._tempRangeChart.destroyRangeChart(chart)
      expect(chart._rangeChartCreated).to.equal(false)
    })
  })

  describe("Calcuating correct chart heights", () => {
    var smallChart = 500
    var tallChart = 1200
    it ("should calculate chart heights", () => {
      expect(calcChartHeightWithMaxRangeChartHeight(smallChart)).to.equal(375)
      expect(calcChartHeightWithMaxRangeChartHeight(tallChart)).to.equal(tallChart - MAX_RANGE_HEIGHT_IN_PX)

    })
    it ("should calculate range chart heights", () => {
      expect(calcMaxRangeChartHeight(smallChart)).to.equal(125)
      expect(calcMaxRangeChartHeight(tallChart)).to.equal(MAX_RANGE_HEIGHT_IN_PX)
    })
  })
})
