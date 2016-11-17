import chai, {expect} from "chai"
import spies from "chai-spies"
import groupAllMixin from "../src/dc-group-all-mixin"
import dc from "../../index"

chai.use(spies)

describe("Group All Mixin", () => {
  describe('groupAll', () => {
    it('should set the groupAll and return it', () => {
      const dc = groupAllMixin({})
      const groupAll = {
        getCrossfilterId: () => 0
      }
      dc.groupAll(groupAll)

      var rtn = {}
      rtn[groupAll.getCrossfilterId()] = groupAll;
      expect(dc.groupAll()).to.eql(rtn);
    })
  })

  describe("getLastFilteredSizeAsync", () => {
    it("should call valueAsync and set lastFilteredSize to the result", done => {
      const value = 100
      const group = {
        valueAsync: chai.spy(() => Promise.resolve(value)),
        getCrossfilterId: () => 0
      }
      const dc = groupAllMixin(group)
      dc.groupAll(group)
      return dc.getLastFilteredSizeAsync(group).then(v => {
        expect(v).to.equal(value)
        expect(dc.lastFilteredSize(group.getCrossfilterId())).to.equal(value)
        done()
      })
    })

    it("should call valueAsync and set lastFilteredSize for all groups", done => {
      var groupCnt = 0;
      function createGroup(value) {
        var id = groupCnt++;
        return {
          valueAsync: chai.spy(() => Promise.resolve(value)),
          getCrossfilterId: () => id,
          myValue: value
        }
      }
      const dc = groupAllMixin({})

      const groups = [createGroup(10), createGroup(50), createGroup(100)]
      groups.forEach(group => {
        dc.groupAll(group)
      })
      return dc.getLastFilteredSizeAsync().then(() => {
        groups.forEach(group => {
          expect(dc.lastFilteredSize(group.getCrossfilterId())).to.equal(group.myValue)
        })
        done()
      })
    })

    it("getLastFilteredSizeAsync should throw error if invalid crossfilter id", done => {
      const dc = groupAllMixin({})
      const group = {
        getCrossfilterId: () => 0
      }
      dc.groupAll(group)
      return dc.getLastFilteredSizeAsync(1).then((error, result) => {
        expect(error).to.not.eq(null)
        done()
      })
    })

    it("getLastFilteredSizeAsync should throw error if invalid group", done => {
      const dc = groupAllMixin({})
      const group = {
        getCrossfilterId: () => 0
      }
      dc.groupAll(group)

      const badgroup = {}
      return dc.getLastFilteredSizeAsync(badgroup).then((error, result) => {
        expect(error).to.not.eq(null)
        done()
      })
    })

    it("getLastFilteredSizeAsync should throw error group object not been groupAll'd", done => {
      const dc = groupAllMixin({})
      const group = {
        getCrossfilterId: () => 0
      }
      return dc.getLastFilteredSizeAsync(group).then((error, result) => {
        expect(error).to.not.eq(null)
        done()
      })
    })


  })
})
