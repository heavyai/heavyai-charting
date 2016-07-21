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
})
