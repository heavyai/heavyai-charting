import * as Helpers from "./formatting-helpers"
import { expect } from "chai"

describe("Formatting Helpers", () => {
  describe("isPlainObject", () => {
    it("should return false for non-objects", () => {
      expect(Helpers.isPlainObject(1)).to.equal(false)
    })
    it("should return false for date objects", () => {
      expect(Helpers.isPlainObject(new Date())).to.equal(false)
    })
    it("should return true for plain objects", () => {
      expect(Helpers.isPlainObject({})).to.equal(true)
    })
  })
  describe("hasAllObjects", () => {
    it("should return true when all items are objects in array", () => {
      expect(Helpers.hasAllObjects([{}, {}])).to.equal(true)
    })
    it("should return false when all items are not objects in array", () => {
      expect(Helpers.hasAllObjects([1, 1])).to.equal(false)
    })
  })
  describe("isArrayOfObjects", () => {
    it("should return true when all items are objects in array", () => {
      expect(Helpers.isArrayOfObjects([{}, {}])).to.equal(true)
    })
    it("should return false when all items are not objects in array", () => {
      expect(Helpers.isArrayOfObjects(1)).to.equal(false)
    })
  })
  describe("normalizeArrayByValue", () => {
    it("should map value property of a collection object", () => {
      expect(
        Helpers.normalizeArrayByValue([{ value: 1 }, { value: 2 }])
      ).to.deep.equal([1, 2])
    })
    it("should return the collection if it isn't a collection of objects", () => {
      const collection = [new Date(1), new Date(2)]
      expect(Helpers.normalizeArrayByValue(collection)).to.deep.equal([
        new Date(1),
        new Date(2)
      ])
    })
  })
  describe("formatNumber", () => {
    it("should add commas to large numbers", () => {
      expect(Helpers.formatNumber(10000)).to.equal("10,000")
    })
    it("should round decimenals", () => {
      expect(Helpers.formatNumber(3.33333)).to.equal("3.33")
    })
  })
  describe("formatValue", () => {
    it("should format large numbers", () => {
      expect(Helpers.formatDataValue(10000)).to.equal("10,000")
    })
    it("should format dates", () => {
      expect(Helpers.formatDataValue(new Date(Date.UTC(2001, 0, 1)))).to.equal(
        "Jan 1, 2001  00:00:00"
      )
    })
    it("should format strings", () => {
      expect(Helpers.formatDataValue("TEST")).to.equal("TEST")
    })
    it("should format null value", () => {
      expect(Helpers.formatDataValue(null)).to.equal(
        '<tspan class="null-value"> NULL </tspan>'
      )
    })
  })
  describe("maybeFormatInfinity", () => {
    const valList = [{ val: 100 }, { val: "-Infinity" }, { val: "Infinity" }]

    it("should do nothing to numbers", () => {
      expect(Helpers.maybeFormatInfinity(valList)[0]).to.deep.equal(valList[0])
    })
    it("should handle '-Infinity'", () => {
      expect(Helpers.maybeFormatInfinity(valList)[1]).to.deep.equal({
        val: 0,
        label: "-Infinity"
      })
    })
    it("should handle Infinity", () => {
      expect(Helpers.maybeFormatInfinity(valList)[2]).to.deep.equal({
        val: 0,
        label: "Infinity"
      })
    })
  })
  describe("formatDataValue", () => {
    it("should format results with object collections", () => {
      expect(
        Helpers.formatDataValue([
          {
            alias: "July",
            value: 7,
            timeBin: "month",
            isExtract: true,
            extractUnit: "month"
          },
          {
            alias: "August",
            value: 8,
            timeBin: "month",
            isExtract: true,
            extractUnit: "month"
          }
        ])
      ).to.equal("Jul")
      expect(
        Helpers.formatDataValue([
          {
            alias: "July",
            value: new Date(Date.UTC(2016, 10, 1)),
            timeBin: "month"
          },
          {
            alias: "August",
            value: new Date(Date.UTC(2016, 10, 1)),
            timeBin: "month"
          }
        ])
      ).to.equal("Nov 2016")
    })
    it("should format results with non-object collections", () => {
      expect(Helpers.formatDataValue([10000, 20000])).to.equal(
        "10,000 \u2013 20,000"
      )
    })
    it("shoud format other formats", () => {
      expect(Helpers.formatDataValue("ATL")).to.equal("ATL")
    })
  })

  describe("formatTimeBinValue", () => {
    const decade = [
      { value: new Date(Date.UTC(2001, 0, 1)), timeBin: "decade" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "decade" }
    ]
    const year = [
      { value: new Date(Date.UTC(2001, 0, 1)), timeBin: "year" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "year" }
    ]
    const quarter = [
      { value: new Date(Date.UTC(2001, 0, 1)), timeBin: "quarter" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "quarter" }
    ]
    const week = [
      { value: new Date(Date.UTC(2001, 0, 1)), timeBin: "week" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "week" }
    ]
    const month = [
      { value: new Date(Date.UTC(2010, 11, 1)), timeBin: "month" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "month" }
    ]

    const day = [
      { value: new Date(Date.UTC(2010, 11, 12)), timeBin: "day" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "day" }
    ]

    const minute = [
      { value: new Date(Date.UTC(2010, 11, 12)), timeBin: "minute" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "minute" }
    ]

    it("should format decade correctly", () => {
      expect(Helpers.formatTimeBinValue(decade, "decade")).to.equal(
        "2001 \u2013 2010"
      )
    })

    it("should format year correctly", () => {
      expect(Helpers.formatTimeBinValue(year, "year")).to.equal("2001")
    })

    it("should format quarter correctly", () => {
      expect(Helpers.formatTimeBinValue(quarter, "quarter")).to.equal("1Q 2001")
    })

    it("should format week correctly", () => {
      expect(Helpers.formatTimeBinValue(week, "week")).to.equal(
        "Jan 1 \u2013 Dec 31, 2010"
      )
    })

    it("should format month correctly", () => {
      expect(Helpers.formatTimeBinValue(month, "month")).to.equal("Dec 2010")
    })

    it("should format day correctly", () => {
      expect(Helpers.formatTimeBinValue(day, "day")).to.equal("Dec 12, 2010")
    })

    it("should format minute correctly", () => {
      expect(Helpers.formatTimeBinValue(minute, "minute")).to.equal(
        "Dec 12, 2010  00:00"
      )
    })
  })

  describe("formatExtractValue", () => {
    const isodow = 3
    const month = 3
    const quarter = 3
    const minute = 3

    it("should format isodow correctly", () => {
      expect(Helpers.formatExtractValue(isodow, "isodow")).to.equal("Wed")
    })

    it("should format extracted month correctly", () => {
      expect(Helpers.formatExtractValue(month, "month")).to.equal("Mar")
    })

    it("should format extracted quarter correctly", () => {
      expect(Helpers.formatExtractValue(quarter, "quarter")).to.equal("Q3")
    })
    it("should format extracted minute correctly", () => {
      expect(Helpers.formatExtractValue(minute, "minute")).to.equal(4)
    })
    it("should format extracted time correctly", () => {
      expect(Helpers.formatExtractValue(minute, "")).to.equal(3)
    })
  })

  describe("formatArrayValue", () => {
    const month = [
      { value: new Date(Date.UTC(2010, 11, 1)), timeBin: "month" },
      { value: new Date(Date.UTC(2010, 11, 31)), timeBin: "month" }
    ]

    const data = [2.33333, 10.25343]

    it("should format date array correctly", () => {
      expect(Helpers.formatArrayValue(month)).to.equal("Dec 2010")
    })

    it("should format number array", () => {
      expect(Helpers.formatArrayValue(data)).to.equal("2.33 – 10.25")
    })
  })

  describe("format cache helper", () => {
    const AxisMock = function () {
      let cachedFormat = d => d + "foo"
      return {
        tickFormat: d => {
          if (!d) {
            return cachedFormat
          }
          cachedFormat = d
        }
      }
    }

    const axisMock = AxisMock()
    const formatCache = Helpers.formatCache(axisMock)

    it("should cache the format", () => {
      expect(axisMock.tickFormat()("a")).to.equal("afoo")
      formatCache.setTickFormat(d => d + "bar")
      expect(axisMock.tickFormat()("a")).to.equal("abar")
      formatCache.setTickFormatFromCache()
      expect(axisMock.tickFormat()("a")).to.equal("afoo")
    })

  })
})
