import {expect} from "chai"
import * as dc from "../index"

describe("Events", () => {
  it('should have all the necessary exports', () => {
    expect(typeof dc.events.trigger).to.equal("function")
  })
})
