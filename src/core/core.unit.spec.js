import { expect } from "chai"
import * as dc from "../index"

describe("Core", () => {
  describe("Properties", () => {
    it("should have sampledCount", () => {
      expect(dc.sampledCount()).to.equal(0)
      dc.incrementSampledCount()
      expect(dc.sampledCount()).to.equal(1)
      dc.decrementSampledCount()
      expect(dc.sampledCount()).to.equal(0)
    })
    it("should have logging", () => {
      expect(dc.logging()).to.equal(false)
      dc.logging(true)
      expect(dc.logging()).to.equal(true)
      dc.logging(false)
      expect(dc.logging()).to.equal(false)
    })
    it("should have refreshDisabled", () => {
      expect(dc.refreshDisabled()).to.equal(false)
      dc.disableRefresh()
      expect(dc.refreshDisabled()).to.equal(true)
      dc.enableRefresh()
      expect(dc.refreshDisabled()).to.equal(false)
    })
    it("should have globalTransitionDuration", () => {
      expect(dc.globalTransitionDuration()).to.equal(null)
      dc.globalTransitionDuration(50)
      expect(dc.globalTransitionDuration()).to.equal(50)
      dc.globalTransitionDuration(null)
      expect(dc.globalTransitionDuration()).to.equal(null)
    })
    it("should have disableTransitions", () => {
      expect(dc.disableTransitions()).to.equal(false)
      dc.disableTransitions(true)
      expect(dc.disableTransitions()).to.equal(true)
      dc.disableTransitions(false)
      expect(dc.disableTransitions()).to.equal(false)
    })
  })

  describe("chartRegistry", () => {
    it("should have the proper methods", () => {
      expect(typeof dc.chartRegistry.has).to.equal("function")
      expect(typeof dc.chartRegistry.register).to.equal("function")
      expect(typeof dc.chartRegistry.deregister).to.equal("function")
      expect(typeof dc.chartRegistry.clear).to.equal("function")
      expect(typeof dc.chartRegistry.list).to.equal("function")
    })
  })
})
