import chai, {expect} from "chai"
import spies from "chai-spies"
import dc from "../../index"

chai.use(spies)

const chartStub = {
  data: () => {},
  label: () => {}
}

describe("MapD Base Mixin", () => {
  const base = dc.baseMixin({})
  describe("inheritance chain", () => {
    it('should should all methods of asyncMixin', () => {
      Object.keys(dc.asyncMixin(chartStub)).forEach(method => {
        expect(base.hasOwnProperty(method)).to.equal(true)
      })
    })
    it('should should all methods of multipleKeysLabelMixin', () => {
      Object.keys(dc.multipleKeysLabelMixin(chartStub)).forEach(method => {
        expect(base.hasOwnProperty(method)).to.equal(true)
      })
    })
  })
  describe('labels', () => {
    it('should enable labeling by default', () => {
      expect(base.renderLabel()).to.equal(true)
    })
  })
  describe('redraw', () => {
    const redrawAllAsync = dc.redrawAllAsync
    beforeEach(() => {
      dc._redrawCount = 0
      dc.redrawAllAsync = chai.spy(() => Promise.resolve())
    })
    after(() => {
      dc.redrawAllAsync = redrawAllAsync
      dc.resetRedrawStack()
    })
    describe("when invoked with queryGroupId and queryCount", () => {
      describe("when redrawStack is empty at the end", () => {
        it("should call redrawAllAsync", () => {
          dc._redrawIdStack = 2
          base.redraw(0, 0, 1, {})
          expect(dc.redrawAllAsync).to.have.been.called()
        })
      })
      describe("when redrawStack is not empty at the end", () => {
        it("should not call redrawAllAsync", () => {
          dc._redrawIdStack = 0
          base.redraw(0, 0, 1, {})
          expect(dc.redrawAllAsync).to.have.not.been.called()
        })
      })
    })
  })
})
