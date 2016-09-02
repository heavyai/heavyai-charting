import chai, {expect} from "chai"
import spies from "chai-spies"
import groupAllMixin from "../src/dc-group-all-mixin"
import dc from "../../index"

chai.use(spies)

describe("Group All Mixin", () => {
  describe('groupAll', () => {
    it('should set the groupAll and return it', () => {
      const dc = groupAllMixin({})
      dc.groupAll("TEST")
      expect(dc.groupAll()).to.equal("TEST")
    })
  })

  describe("getLastFilteredSizeAsync", () => {
    it("should call valueAsync and set lastFilteredSize to the result", () => {
      const value = 100
      const groupAll = {
        valueAsync: chai.spy(() => Promise.resolve(value))
      }
      const dc = groupAllMixin(groupAll)
      dc.groupAll(groupAll)
      return dc.getLastFilteredSizeAsync().then(v => {
        expect(v).to.equal(value)
        expect(dc.lastFilteredSize()).to.equal(value)
      })
    })
  })
})
