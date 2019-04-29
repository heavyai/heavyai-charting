import * as dc from "../index"
import chai, { expect } from "chai"
import spies from "chai-spies"

chai.use(spies)

describe("Core Async", () => {
  before(() => {
    dc.chartRegistry.clear()
  })

  describe("Tracker", () => {
    let tracker = null

    beforeEach(() => {
      tracker = new dc.LockTracker(chai.spy())
    })

    describe("shouldStart", () => {
      it("should return true when nothing is tracked", () => {
        expect(tracker.shouldStart("group")).to.be.true
        expect(tracker.shouldStart(null, true)).to.be.true
      })

      it("should return false if a group is already tracked", () => {
        tracker.request("group")
        expect(tracker.shouldStart("group")).to.be.false
        expect(tracker.shouldStart(null, true)).to.be.false
      })

      it("should return true even if another group is tracked", () => {
        tracker.request("group1")
        expect(tracker.shouldStart("group2")).to.be.true
      })

      it("should return false if 'all' is tracked", () => {
        tracker.request(null, true)
        expect(tracker.shouldStart("group")).to.be.false
        expect(tracker.shouldStart(null, true)).to.be.false
      })
    })

    describe("request", () => {
      it("should return true and track group if nothing is tracked", () => {
        expect(tracker.request("group")).to.be.true
        expect(tracker.groups.has("group")).to.be.true
      })

      it("should return true and track all if nothing is tracked", () => {
        expect(tracker.request(null, true)).to.be.true
        expect(tracker.all).to.be.true
      })

      it("should return true and track a new group, even if another group is tracked", () => {
        tracker.request("group1")
        expect(tracker.request("group2")).to.be.true
        expect(tracker.groups.has("group2")).to.be.true
      })

      it("should return false and mark pending if a group is already tracked", () => {
        tracker.request("group")
        expect(tracker.request("group")).to.be.false
        expect(tracker.pendingGroups.has("group")).to.be.true
      })

      it("should return false and mark pending if tracking all", () => {
        tracker.request(null, true)
        expect(tracker.request("group")).to.be.false
        expect(tracker.pendingGroups.has("group")).to.be.true
      })

      it("should return false, mark pending all, and clear pending groups if requesting all while tracking something", () => {
        tracker.request("group")
        tracker.request("group")
        expect(tracker.request(null, true)).to.be.false
        expect(tracker.pendingAll).to.be.true
        expect(tracker.pendingGroups).to.be.empty
      })
    })

    describe("finished", () => {
      it("should clear the tracked group", () => {
        tracker.request("group")
        tracker.finished("group")()
        expect(tracker.groups.has("group")).to.be.false
      })

      it("should clear the all flag", () => {
        tracker.request(null, true)
        tracker.finished(null, true)()
        expect(tracker.all).to.be.false
      })

      it("should chain to the pending group", () => {
        tracker.request("group")
        tracker.request("group")
        tracker.finished("group")()
        expect(tracker.renderOrRedrawFunc).to.have.been.called.once.with("group")
      })

      it("should chain to all", () => {
        tracker.request("group")
        tracker.request(null, true)
        tracker.finished("group")()
        expect(tracker.renderOrRedrawFunc).to.have.been.called.once.with(null, true)
      })
    })
  })

  describe("redrawAllAsync", () => {
    function mockDataAsync(group, callback) {
      callback(null, [])
    }

    function createChart() {
      const chart = {
        _invokeDataFetchListener: chai.spy(),
        expireCache: chai.spy(),
        redrawAsync: chai.spy(() => new Promise(resolve => resolve())),
        renderAsync: chai.spy(() => new Promise(resolve => resolve()))
      }
      return chart
    }

    let charts = []

    before(() => {
      charts = [createChart(), createChart(), createChart()]
      charts.forEach(chart => {
        dc.chartRegistry.register(chart)
      })
    })

    after(() => {
      dc.chartRegistry.clear()
    })

    it("should call redraw for each chart in the group", done => {
      Promise.resolve()
        .then(() => dc.renderAllAsync())
        .then(() => dc.redrawAllAsync())
        .then(() => {
          charts.forEach(chart => {
            expect(chart.redrawAsync).to.have.been.called.once()
          })
          done()
        })
    })

    it("should immediately resolve and set redraw stack empty to false when invoked when redrawAllAsync is already in flight", done => {
      dc.chartRegistry.list()[0].redrawAsync = () =>
        new Promise(resolve => {
          setTimeout(() => resolve())
        })

      expect(dc.redrawStackEmpty()).to.equal(true)
      dc.redrawAllAsync()
      dc.redrawAllAsync().then(() => {
        expect(dc.redrawStackEmpty()).to.equal(false)
        done()
      })
    })
  })

  describe("groupAll getter/setter", () => {
    it("should properly set and get group", () => {
      const CROSSFILTER_ID = 1
      const group = { getCrossfilterId: () => CROSSFILTER_ID }
      dc.groupAll(group)
      expect(dc.groupAll()[CROSSFILTER_ID]).to.equal(group)
    })
  })
})
