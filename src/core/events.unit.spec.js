import * as dc from "../index"
import { expect } from "chai"

describe("Events", () => {
  it("should have all the necessary exports", () => {
    expect(typeof dc.events.trigger).to.equal("function")
  })
})
