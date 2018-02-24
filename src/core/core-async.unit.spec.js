import * as dc from "../index"
import chai, { expect } from "chai"
import spies from "chai-spies"

chai.use(spies)

describe("Core Async", () => {
  before(() => {
    dc.chartRegistry.clear()
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
