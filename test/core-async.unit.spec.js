import {expect} from "chai"
import * as dc from "../src"

describe("Core Async", () => {
  describe("groupAll getter/setter", () => {
    it("should properly set and get group", () => {
      const CROSSFILTER_ID = 1
      const group = { getCrossfilterId: () => CROSSFILTER_ID }
      dc.groupAll(group)
      expect(dc.groupAll()[CROSSFILTER_ID]).to.equal(group)
    })
  })
})
