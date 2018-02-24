import mixin from "./lock-axis-mixin"
import { expect } from "chai"

describe("lock axis mixin", () => {
  let chart

  beforeEach(() => {
    chart = {
      on: () => () => null
    }
    chart = mixin(chart)
  })
  describe("constructor", () => {
    it("should mixin a prepareLockAxis method", () => {
      expect(typeof chart.prepareLockAxis).to.equal("function")
    })
    it("should create an elasticX event", done => {
      chart.on("elasticX", function() {
        done()
      })
      chart._invokeelasticXListener()
    })
  })
})
