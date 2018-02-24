import {
  autoBinParams,
  checkIfTimeBinInRange,
  createBinParams
} from "./binning-helpers"
import chai, { expect } from "chai"
import spies from "chai-spies"
chai.use(spies)

describe("Binning Helpers", () => {
  const DEFAULT_BINS = 400

  describe("autoBinParams", () => {
    it("should select day as time bin", () => {
      const timeBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
      const result = autoBinParams(timeBounds, DEFAULT_BINS)
      expect(result).to.equal("day")
    })

    it("should select week as time bin", () => {
      const timeBounds = [new Date("Jan 01 2010"), new Date("Jan 01 2017")]
      const result = autoBinParams(timeBounds, DEFAULT_BINS)
      expect(result).to.equal("week")
    })

    it("should select month as time bin", () => {
      const timeBounds = [new Date("Jan 01 2000"), new Date("Jan 01 2017")]
      const result = autoBinParams(timeBounds, DEFAULT_BINS)
      expect(result).to.equal("month")
    })

    it("should select quarter as time bin", () => {
      const timeBounds = [new Date("Jan 01 1917"), new Date("Jan 01 2017")]
      const result = autoBinParams(timeBounds, DEFAULT_BINS)
      expect(result).to.equal("quarter")
    })

    it("should select year as time bin", () => {
      const timeBounds = [new Date("Jan 01 1817"), new Date("Jan 01 2017")]
      const result = autoBinParams(timeBounds, DEFAULT_BINS)
      expect(result).to.equal("year")
    })
  })

  describe("checkIfTimeBinInRange", () => {
    it("should allow current timeBin to be selected if in bounds", () => {
      const timeBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
      const currentTimeBin = "day"
      const result = checkIfTimeBinInRange(
        timeBounds,
        currentTimeBin,
        DEFAULT_BINS
      )
      expect(result).to.equal("day")
    })

    it("should NOT allow current timeBin to be selected if out of bounds", () => {
      const timeBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
      const currentTimeBin = "second"
      const result = checkIfTimeBinInRange(
        timeBounds,
        currentTimeBin,
        DEFAULT_BINS
      )
      expect(result).to.not.equal("second")
      expect(result).to.equal("day")
    })
  })

  describe("createBinParams", () => {
    let chart
    let setBinParams

    beforeEach(() => {
      setBinParams = chai.spy()
      chart = {
        group: () => ({
          binParams: setBinParams
        })
      }
    })

    describe("createBinParams", () => {
      it("should return undefined if chart is missing a group", () => {
        const chartWithoutGroup = {
          group: () => null
        }
        const binParams = []
        const result = createBinParams(chartWithoutGroup, binParams)
        expect(result).to.equal(undefined)
      })

      it("should return undefined if binParams is null", () => {
        const chartWithoutBinParams = {
          group: () => ({
            binParams: null
          })
        }
        const binParams = []
        const result = createBinParams(chartWithoutBinParams, binParams)
        expect(result).to.equal(undefined)
      })

      it("should arrayify if binParams is not an array", () => {
        const binParams = { binBounds: [0, 100] }
        createBinParams(chart, binParams)
        expect(setBinParams).to.be.called.with([
          { binBounds: [0, 100], extract: false, timeBin: "auto" }
        ])
      })

      it("should autoBin if binParams is a timeBin and NOT have an explicit timeBin", () => {
        const binBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
        const binParams = [{ binBounds, numBins: DEFAULT_BINS }]
        createBinParams(chart, binParams)
        expect(setBinParams).to.be.called.with([
          {
            binBounds: binBounds.slice(),
            numBins: 400,
            extract: false,
            timeBin: "day",
            auto: true
          }
        ])
      })

      it("should NOT autoBin if binParams is a timeBin and has has explicitly set timeBin", () => {
        const binBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
        const binParams = [
          { binBounds, numBins: DEFAULT_BINS, timeBin: "second" }
        ]
        createBinParams(chart, binParams)
        expect(setBinParams).to.be.called.with([
          {
            binBounds: binBounds.slice(),
            numBins: 400,
            extract: false,
            timeBin: "second"
          }
        ])
      })

      it("should set timeBin to default extract if extract is true", () => {
        const binBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
        const binParams = [{ binBounds, numBins: DEFAULT_BINS, extract: true }]
        createBinParams(chart, binParams)
        expect(setBinParams).to.be.called.with([
          {
            binBounds: binBounds.slice(),
            numBins: 400,
            extract: true,
            timeBin: "isodow",
            auto: true
          }
        ])
      })
    })

    xdescribe("createLineOrHistogramBinParams", () => {
      it("should change timeBin if it is a line chart and Time Bin is out of range of what can be displayed", () => {
        const binBounds = [new Date("Jan 01 2016"), new Date("Jan 01 2017")]
        const binParams = [
          { binBounds, numBins: DEFAULT_BINS, timeBin: "second" }
        ]
        createLineOrHistogramBinParams(chart, binParams)
        expect(setBinParams).to.be.called.with([
          {
            binBounds: binBounds.slice(),
            numBins: 400,
            extract: false,
            timeBin: "day"
          }
        ])
      })
    })
  })
})
