import mixin from "../src/reset-dc-state-mixin"
import spies from "chai-spies"
import chai, {expect} from "chai"

chai.use(spies)

describe("resetDCStateMixin", () => {
  const dc = {
    resetRedrawStack: chai.spy(),
    resetRenderStack: chai.spy()
  }
  describe("resetState", () => {
    mixin(dc).resetState()
    it('should reset the redraw stack', () => {
      expect(dc.resetRedrawStack).to.have.been.called()
    })
    it('should reset the render stack', () => {
      expect(dc.resetRenderStack).to.have.been.called()
    })
  })
})
