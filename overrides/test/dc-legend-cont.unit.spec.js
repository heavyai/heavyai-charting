import chai, {expect} from "chai"
import spies from "chai-spies"
import dcLegendCont from "../src/dc-legend-cont"
// import dc from "../../index"

chai.use(spies)

describe("dc legend cont", () => {
  let legend
  beforeEach(()=> {
    legend = dcLegendCont()
  })
  describe('legend lock', () => {
    it('should instanciate the legend with it unlocked', () => {
      expect(legend.isLocked()).to.equal(false)
    })
    it('should set the legend to locked state', () => {
      legend.isLocked(true)
      expect(legend.isLocked()).to.equal(true)
    })
  })

  describe('legend parent', () => {
    it('should instanciate the legend with no parent', () => {
      expect(legend.parent()).to.equal(null)
    })
    it('should set the parent to node', () => {
      const node = window.document.createElement("DIV")
      legend.parent(node)
      expect(legend.parent()).to.equal(node)
    })
  })

  describe('legend minMax', () => {
    it('should instanciate the legend with no minMax', () => {
      expect(legend.minMax()).to.equal(null)
    })
    it('should set the legend minMax to value', () => {
      legend.minMax([1,1000])
      expect(legend.minMax()).to.deep.equal([1,1000])
    })
  })
})
