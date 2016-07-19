
import chai, {expect} from "chai"
import spies from "chai-spies"
import coreMixin, {redrawAllAsync} from "../src/core"

chai.use(spies)

const dc = coreMixin(require("../../mapdc"))
const INITIAL_COUNT = 0
const charts = [{}, {}]

function resetDCState () {
  dc._refreshDisabled = false
  dc._renderId = INITIAL_COUNT
  dc._redrawId = INITIAL_COUNT
  dc._renderCount = INITIAL_COUNT
  dc._redrawCount = INITIAL_COUNT
  dc._renderIdStack = null
  dc._redrawIdStack = null
  dc.chartRegistry.list = () => charts
}

function setUpChartSpies() {
  charts.forEach((chart) => {
    chart.redrawAsync = chai.spy()
    chart.renderAsync = chai.spy()
    chart.expireCache = chai.spy()
  })
}

describe("Core Overrides", () => {
  describe("redrawAllAsync", () => {
    beforeEach(() => {
      resetDCState()
      setUpChartSpies()
    })
    describe('when dc._refreshDisabled is true', () => {
      it("should bail out and return a Promise", () => {
        dc._refreshDisabled = true
        expect(redrawAllAsync() instanceof Promise).to.equal(true)
        charts.forEach((chart) => {
          expect(chart.redrawAsync).to.have.not.been.called()
        })
      })
    })
    describe('debouncing behavior', () => {
      beforeEach(() => {
        redrawAllAsync()
      })
      it('should increment dc._redrawId', () => {
        expect(dc._redrawId).to.equal(INITIAL_COUNT + 1)
      })
      it('should set the queryGroupId to dc._redrawId before incrementing it and assign it to dc._redrawIdStack', (() => {
        expect(dc._redrawIdStack).to.equal(INITIAL_COUNT)
      }))
      describe('when dc._redrawIdStack is null', () => {
        it('should bail out and return a Promise', () => {
          const output = redrawAllAsync()
          expect(output instanceof Promise).to.equal(true)
          charts.forEach((chart) => {
            expect(chart.redrawAsync).to.have.been.called.exactly(1)
          })
        })
      })
    })
    describe('when redraw stack is empty', () => {
      describe('when dc.sampleCount is greater than 0', () => {
        it('should call redrawAsync for every chart with the dc._redrawId and the number of charts minus one', () => {
          const queryGroupId = dc._redrawId
          dc._sampledCount = 1
          redrawAllAsync()
          charts.forEach((chart) => {
            expect(chart.redrawAsync).to.have.been.called.with(queryGroupId, charts.length - 1)
          })
        })
      })
      describe('when dc.sampleCount is not greater then 0', () => {
        it('should call redrawAsync for every chart with the dc._redrawId and the number of charts', () => {
          const queryGroupId = dc._redrawId
          dc._sampledCount = 0
          redrawAllAsync()
          charts.forEach((chart) => {
            expect(chart.redrawAsync).to.have.been.called.with(queryGroupId, charts.length)
          })
        })
      })

      let counter = 0
      const resolveAsync = () => new Promise((resolve) => {
        counter++
        setTimeout(() => resolve(), 1)
      })
      it('should return a Promise that resolves when all promises have been resolved', function (done) {
        charts.forEach((chart) => {
          chart.redrawAsync = chai.spy(() => resolveAsync())
        })
        return redrawAllAsync().then(() => {
          expect(counter).to.equal(charts.length)
          done()
        })
      })
      it('should call expireCache for each chart', () => {
        redrawAllAsync()
        charts.forEach((chart) => {
          expect(chart.expireCache).to.have.been.called()
        })
      })
    })
  })
})
