import chai, {expect} from "chai"
import spies from "chai-spies"
import dc from "../../index"

chai.use(spies)

describe("MapD BarChart Chart", () => {
  let bar
  beforeEach(() => {
    const node = window.document.createElement("DIV")
    bar = dc.barChart(node).x(d3.scale.linear().domain())
  })
  describe("renderLabels", () => {
    xit('should return false', () => {
      expect(bar.renderLabels()).to.equal(false)
    })
  })
})
