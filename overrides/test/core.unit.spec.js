
import chai, {expect} from "chai"
import spies from "chai-spies"
import asyncMixin from "../src/dc-async-mixin"

chai.use(spies)

const dc = asyncMixin(require("../../mapdc"))
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
  describe("redrawStack", () => {
    it('should be initialized correctly', () => {
      expect(dc._redrawId).to.equal(0)
      expect(dc._redrawCount).to.equal(0)
      expect(dc._redrawIdStack).to.equal(null)
    })
    describe('incrementRedrawStack', () => {
      let queryGroupId
      let redrawIdBeforeIncrement
      before(() => {
        redrawIdBeforeIncrement = dc._redrawId
        queryGroupId = dc.incrementRedrawStack()
      })
      it('should return the queryGroupId which is equal to the redrawId', () => {
        expect(queryGroupId).to.equal(redrawIdBeforeIncrement)
      })
      it('should increment the redrawId', () => {
        expect(dc._redrawId).to.equal(redrawIdBeforeIncrement + 1)
      })
      it('should set the _redrawIdStack to the queryGroupId', () => {
        expect(dc._redrawIdStack).to.equal(queryGroupId)
      })
    })
    describe("resetRedrawStack", () => {
      it('should reset the _redrawCount and the _redrawIdStack', () => {
        dc._redrawCount = 5
        dc._redrawIdStack = 5
        dc.resetRedrawStack()
        expect(dc._redrawCount).to.equal(0)
        expect(dc._redrawIdStack).to.equal(null)
      })
    })
    describe("isRedrawStackEmpty", () => {
      it('should return whether or no the _redrawIdStack is null or equal to the queryGroupId', () => {
        expect(dc.isRedrawStackEmpty()).to.equal(true)
        dc.incrementRedrawStack()
        dc.incrementRedrawStack()
        expect(dc.isRedrawStackEmpty()).to.equal(false)
        expect(dc.isRedrawStackEmpty(2)).to.equal(true)
      })
    })
    describe("isEqualToRedrawCount", () => {
      it('should return whether or not the queryCount is equal to the redrawCount', () => {
        const initialCount = dc._redrawCount
        expect(dc.isEqualToRedrawCount(initialCount + 1)).to.equal(true)
        expect(dc._redrawCount).to.equal(initialCount + 1)
      })
    })
  })
  describe("redrawAllAsync", () => {
    beforeEach(() => {
      resetDCState()
      setUpChartSpies()
    })
    describe('when dc._refreshDisabled is true', () => {
      it("should bail out and return a Promise", () => {
        dc._refreshDisabled = true
        expect(dc.redrawAllAsync() instanceof Promise).to.equal(true)
        charts.forEach((chart) => {
          expect(chart.redrawAsync).to.have.not.been.called()
        })
      })
    })
    describe('debouncing behavior', () => {
      beforeEach(() => {
        dc.redrawAllAsync()
      })
      it('should increment dc._redrawId', () => {
        expect(dc._redrawId).to.equal(INITIAL_COUNT + 1)
      })
      it('should set the queryGroupId to dc._redrawId before incrementing it and assign it to dc._redrawIdStack', (() => {
        expect(dc._redrawIdStack).to.equal(INITIAL_COUNT)
      }))
      describe('when dc._redrawIdStack is null', () => {
        it('should bail out and return a Promise', () => {
          const output = dc.redrawAllAsync()
          expect(output instanceof Promise).to.equal(true)
          charts.forEach((chart) => {
            expect(chart.redrawAsync).to.have.been.called.exactly(1)
          })
        })
      })
    })
    describe('when dc.groupAll() is true', () => {
      before(() => {
        dc.groupAll = () => true
        dc.getLastFilteredSizeAsync = chai.spy(() => Promise.resolve())
      })

      after(() => {
        dc.groupAll = () => false
      })

      it('should call dc.getLastFilteredSizeAsync', () => {
        const queryGroupId = dc._redrawId
        dc._sampledCount = 0
        dc.redrawAllAsync()

        expect(dc.getLastFilteredSizeAsync).to.have.been.called()

        charts.forEach((chart) => {
          expect(chart.redrawAsync).to.have.been.called.with(queryGroupId, charts.length)
        })
      })
    })
    describe('when redraw stack is empty', () => {
      it('should call redrawAsync for every chart with the dc._redrawId and the number of charts', () => {
        const queryGroupId = dc._redrawId
        dc._sampledCount = 0
        dc.redrawAllAsync()
        charts.forEach((chart) => {
          expect(chart.redrawAsync).to.have.been.called.with(queryGroupId, charts.length)
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
        return dc.redrawAllAsync().then(() => {
          expect(counter).to.equal(charts.length)
          done()
        })
      })
      it('should call expireCache for each chart', () => {
        dc.redrawAllAsync()
        charts.forEach((chart) => {
          expect(chart.expireCache).to.have.been.called()
        })
      })
    })
  })
  describe("renderAllAsync", () => {
    beforeEach(() => {
      resetDCState()
      setUpChartSpies()
    })
    describe('when dc._refreshDisabled is true', () => {
      it("should bail out and return a Promise", () => {
        dc._refreshDisabled = true
        expect(dc.renderAllAsync() instanceof Promise).to.equal(true)
        charts.forEach((chart) => {
          expect(chart.renderAsync).to.have.not.been.called()
        })
      })
    })
    describe('debouncing behavior', () => {
      beforeEach(() => {
        dc.renderAllAsync()
      })
      it('should increment dc._renderId', () => {
        expect(dc._renderId).to.equal(INITIAL_COUNT + 1)
      })
      it('should set the queryGroupId to dc._renderId before incrementing it and assign it to dc._renderIdStack', (() => {
        expect(dc._renderIdStack).to.equal(INITIAL_COUNT)
      }))
      describe('when dc._renderIdStack is null', () => {
        it('should bail out and return a Promise', () => {
          const output = dc.renderAllAsync()
          expect(output instanceof Promise).to.equal(true)
          charts.forEach((chart) => {
            expect(chart.renderAsync).to.have.been.called.exactly(1)
          })
        })
      })
    })
    describe('when dc.groupAll() is true', () => {
      before(() => {
        dc.groupAll = () => true
        dc.getLastFilteredSizeAsync = chai.spy(() => Promise.resolve())
      })

      after(() => {
        dc.groupAll = () => false
      })

      it('should call dc.getLastFilteredSizeAsync', () => {
        const queryGroupId = dc._renderId
        dc._sampledCount = 0
        dc.renderAllAsync()

        expect(dc.getLastFilteredSizeAsync).to.have.been.called()

        charts.forEach((chart) => {
          expect(chart.renderAsync).to.have.been.called.with(queryGroupId, charts.length)
        })
      })
    })
    describe('when render stack is empty', () => {
      it('should call renderAsync for every chart with the dc._renderId and the number of charts', () => {
        const queryGroupId = dc._renderId
        dc._sampledCount = 0
        dc.renderAllAsync()
        charts.forEach((chart) => {
          expect(chart.renderAsync).to.have.been.called.with(queryGroupId, charts.length)
        })
      })

      let counter = 0
      const resolveAsync = () => new Promise((resolve) => {
        counter++
        setTimeout(() => resolve(), 1)
      })
      it('should return a Promise that resolves when all promises have been resolved', function (done) {
        charts.forEach((chart) => {
          chart.renderAsync = chai.spy(() => resolveAsync())
        })
        return dc.renderAllAsync().then(() => {
          expect(counter).to.equal(charts.length)
          done()
        })
      })
      it('should call expireCache for each chart', () => {
        dc.renderAllAsync()
        charts.forEach((chart) => {
          expect(chart.expireCache).to.have.been.called()
        })
      })
    })
  })
})
