import { expect } from "chai"
import * as dc from "../index"

describe("Logger", () => {
  it("should have all the necessary exports", () => {
    expect(typeof dc.logger.warn).to.equal("function")
    expect(typeof dc.logger.debug).to.equal("function")
    expect(typeof dc.logger.deprecate).to.equal("function")
    expect(dc.logger.enableDebugLog).to.equal(false)
  })
})
