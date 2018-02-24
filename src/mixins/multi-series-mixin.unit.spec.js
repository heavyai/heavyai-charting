import chai, { expect } from "chai"
import spies from "chai-spies"
import MultiSeriesMixin from "./multi-series-mixin"
import baseMixin from "./base-mixin"

chai.use(spies)

describe("MultiSeriesMixin", () => {
  describe("series method", () => {
    const chart = MultiSeriesMixin(baseMixin({}))
    const series = chart.series()

    it("should return the series API", () => {
      expect(Object.keys(series)).to.deep.equal([
        "group",
        "values",
        "selected",
        "keys"
      ])
    })
    describe("series API", () => {
      it("should have a values method", () => {
        const values = ["R", "D"]
        series.values(values)
        expect(series.values()).to.deep.equal(values)
      })
      it("should have a group method", () => {
        const group = {}
        series.group(group)
        expect(series.group()).to.deep.equal(group)
      })
      it("should have a selected method", () => {
        const selected = ["D"]
        series.selected(selected)
        expect(series.selected()).to.deep.equal(selected)
      })
    })
  })

  describe("dimension method override", () => {
    const base = baseMixin({})
    base.dimension = chai.spy()

    const dimension = { value: chai.spy(() => []) }
    const chart = MultiSeriesMixin(base)

    it("should set columns to the dimension value", () => {
      chart.dimension(dimension)
      expect(dimension.value).to.have.been.called()
      expect(base._dimension).to.have.been.called.with(dimension)
    })
  })

  describe("isMulti method", () => {
    const chart = MultiSeriesMixin(baseMixin({}))
    it("should return true when the dimension value length is greater than the multi dimension index", () => {
      chart.dimension = () => ({ value: () => ["date", "party"] })
      expect(chart.isMulti()).to.equal(true)
      chart.dimension = () => ({ value: () => ["date"] })
      expect(chart.isMulti()).to.equal(false)
    })
  })

  describe("showOther method", () => {
    const chart = MultiSeriesMixin(baseMixin({}))
    it("should set and get the showOther flag", () => {
      expect(chart.showOther()).to.equal(false)
      chart.showOther(true)
      expect(chart.showOther()).to.equal(true)
    })
  })

  describe("dataAsync callback", () => {
    it("should call group.all when chart is not multi", function(done) {
      const chart = MultiSeriesMixin(baseMixin({}))
      const group = { all: chai.spy(cb => cb()) }
      chart.isMulti = () => false
      chart.group(group)
      chart.dataAsync(() => {
        expect(group.all).to.have.been.called()
        done()
      })
    })
    describe("when chart is multi", () => {
      const values = ["A", "B", "C", "D", "E", "F"]
      const topResults = values.map(v => ({ key0: v }))
      const columns = ["date", "party"]
      const setter = chai.spy()

      let results = [
        {
          val: 500,
          key1: "other",
          key0: [
            { alias: "July 2008", value: new Date("7/1/2008") },
            { alias: "July 2008", value: new Date("7/1/2008") }
          ]
        },
        {
          val: 300,
          key1: "D",
          key0: [
            { alias: "July 2008", value: new Date("7/1/2008") },
            { alias: "July 2008", value: new Date("7/1/2008") }
          ]
        },
        {
          val: 200,
          key1: "R",
          key0: [
            { alias: "July 2008", value: new Date("7/1/2008") },
            { alias: "July 2008", value: new Date("7/1/2008") }
          ]
        },
        {
          val: 100,
          key1: "L",
          key0: [
            { alias: "July 2008", value: new Date("7/1/2008") },
            { alias: "July 2008", value: new Date("7/1/2008") }
          ]
        },
        {
          val: 700,
          key1: "I",
          key0: [
            { alias: "July 2008", value: new Date("7/1/2008") },
            { alias: "July 2008", value: new Date("7/1/2008") }
          ]
        },
        {
          val: 500,
          key1: "other",
          key0: [
            { alias: "August 2008", value: new Date("8/1/2008") },
            { alias: "August 2008", value: new Date("8/1/2008") }
          ]
        },
        {
          val: 300,
          key1: "D",
          key0: [
            { alias: "August 2008", value: new Date("8/1/2008") },
            { alias: "August 2008", value: new Date("8/1/2008") }
          ]
        },
        {
          val: 200,
          key1: "R",
          key0: [
            { alias: "August 2008", value: new Date("8/1/2008") },
            { alias: "August 2008", value: new Date("8/1/2008") }
          ]
        },
        {
          val: 100,
          key1: "L",
          key0: [
            { alias: "August 2008", value: new Date("8/1/2008") },
            { alias: "August 2008", value: new Date("8/1/2008") }
          ]
        },
        {
          val: 700,
          key1: "I",
          key0: [
            { alias: "August 2008", value: new Date("8/1/2008") },
            { alias: "August 2008", value: new Date("8/1/2008") }
          ]
        }
      ]

      const dimension = {
        value: () => columns,
        set: cb => setter(cb(columns)),
        group: () => group,
        multiDim: () => {}
      }

      const group = {
        reduce: chai.spy(() => group),
        topAsync: chai.spy(() => Promise.resolve(topResults)),
        all: chai.spy(cb => cb(null, results)),
        dimension: () => dimension
      }

      const chart = MultiSeriesMixin(baseMixin({}))

      chart.rangeChart = () => true

      let processedResult
      before(function(done) {
        chart.series().group(group)
        chart.group(group)
        chart.dimension(dimension)
        chart.dataAsync((error, result) => {
          processedResult = result
          done()
        })
      })

      it("should get the top values from the series group and set the values and selected", () => {
        expect(group.topAsync).to.have.been.called.with(21, 0)
        expect(group.all).to.have.been.called()
        expect(chart.series().values()).to.deep.equal(values)
        expect(chart.series().selected()).to.deep.equal(values.slice(0, 5))
      })
      it("should set new dimensions with what is selected from the series", () => {
        expect(setter).to.have.been.called.with([
          "date",
          "CASE when party IN ('A','B','C','D','E') then party ELSE 'other' END"
        ])
      })
      it("should call group all and process the results into a series format", () => {
        expect(processedResult).to.deep.equal([
          {
            key0: [
              { value: new Date("7/1/2008"), alias: "July 2008" },
              { value: new Date("7/1/2008"), alias: "July 2008" }
            ],
            other: 500,
            series_2: 300,
            series_3: 200,
            series_4: 100,
            series_5: 700
          },
          {
            key0: [
              { value: new Date("8/1/2008"), alias: "August 2008" },
              { value: new Date("8/1/2008"), alias: "August 2008" }
            ],
            other: 500,
            series_2: 300,
            series_3: 200,
            series_4: 100,
            series_5: 700
          }
        ])
      })

      describe("processedResult when result is from extract", () => {
        before(function(done) {
          results = [
            {
              val: 500,
              key1: "other",
              key0: [{ alias: "July", value: 7, isExtract: true }]
            },
            {
              val: 300,
              key1: "D",
              key0: [{ alias: "July", value: 7, isExtract: true }]
            },
            {
              val: 200,
              key1: "R",
              key0: [{ alias: "July", value: 7, isExtract: true }]
            },
            {
              val: 100,
              key1: "L",
              key0: [{ alias: "July", value: 7, isExtract: true }]
            },
            {
              val: 700,
              key1: "I",
              key0: [{ alias: "July", value: 7, isExtract: true }]
            },
            {
              val: 500,
              key1: "other",
              key0: [{ alias: "August", value: 8, isExtract: true }]
            },
            {
              val: 300,
              key1: "D",
              key0: [{ alias: "August", value: 8, isExtract: true }]
            },
            {
              val: 200,
              key1: "R",
              key0: [{ alias: "August", value: 8, isExtract: true }]
            },
            {
              val: 100,
              key1: "L",
              key0: [{ alias: "August", value: 8, isExtract: true }]
            },
            {
              val: 700,
              key1: "I",
              key0: [{ alias: "August", value: 8, isExtract: true }]
            }
          ]
          chart.series().group(group)
          chart.group(group)
          chart.dimension(dimension)
          chart.dataAsync((error, result) => {
            processedResult = result
            done()
          })
        })

        it("should call group all and process the results into a series format", () => {
          expect(processedResult).to.deep.equal([
            {
              key0: [{ alias: "July", value: 7, isExtract: true }],
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            },
            {
              key0: [{ alias: "August", value: 8, isExtract: true }],
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            }
          ])
        })
      })

      describe("processedResult when result is numerical", () => {
        before(function(done) {
          results = [
            { val: 500, key1: "other", key0: [50, 100] },
            { val: 300, key1: "D", key0: [50, 100] },
            { val: 200, key1: "R", key0: [50, 100] },
            { val: 100, key1: "L", key0: [50, 100] },
            { val: 700, key1: "I", key0: [50, 100] },
            { val: 500, key1: "other", key0: [100, 150] },
            { val: 300, key1: "D", key0: [100, 150] },
            { val: 200, key1: "R", key0: [100, 150] },
            { val: 100, key1: "L", key0: [100, 150] },
            { val: 700, key1: "I", key0: [100, 150] }
          ]
          chart.series().group(group)
          chart.group(group)
          chart.dimension(dimension)
          chart.dataAsync((error, result) => {
            processedResult = result
            done()
          })
        })

        it("should call group all and process the results into a series format", () => {
          expect(processedResult).to.deep.equal([
            {
              key0: [50, 100],
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            },
            {
              key0: [100, 150],
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            }
          ])
        })
      })

      describe("processedResult when result is unbinned", () => {
        before(function(done) {
          results = [
            { val: 500, key1: "other", key0: 50 },
            { val: 300, key1: "D", key0: 50 },
            { val: 200, key1: "R", key0: 50 },
            { val: 100, key1: "L", key0: 50 },
            { val: 700, key1: "I", key0: 50 },
            { val: 500, key1: "other", key0: 100 },
            { val: 300, key1: "D", key0: 100 },
            { val: 200, key1: "R", key0: 100 },
            { val: 100, key1: "L", key0: 100 },
            { val: 700, key1: "I", key0: 100 }
          ]
          chart.series().group(group)
          chart.group(group)
          chart.dimension(dimension)
          chart.dataAsync((error, result) => {
            processedResult = result
            done()
          })
        })

        it("should call group all and process the results into a series format", () => {
          expect(processedResult).to.deep.equal([
            {
              key0: 50,
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            },
            {
              key0: 100,
              other: 500,
              series_2: 300,
              series_3: 200,
              series_4: 100,
              series_5: 700
            }
          ])
        })
      })
    })
  })

  describe("_doRedraw", () => {
    const chart = MultiSeriesMixin(baseMixin({}))
    const selected = ["D", "R", "L"]

    function setup() {
      chart.__doRedraw = chai.spy()
      chart.generatePopup = chai.spy()
      chart.dimension = () => ({ value: () => ["date", "party"] })
      chart.group = () => ({})
      // set up mocks and render
      chart.stack = chai.spy(() => [])
      chart.series().selected(selected)
      chart.series().keys([])
    }

    it("should call generatePopup when is multi line and doRedraw is called", () => {
      chart.isMulti = () => true
      setup()
      chart._doRedraw()
      expect(chart.__doRedraw).to.have.been.called()
      expect(chart.generatePopup).to.have.been.called()
    })

    it("should call not generatePopup when is multi line and doRedraw is called", () => {
      chart.isMulti = () => false
      setup()
      chart._doRedraw()
      expect(chart.__doRedraw).to.have.been.called()
      expect(chart.generatePopup).to.not.have.been.called()
    })
  })

  describe("preRender listener", () => {
    let chart = null
    const selected = ["D", "R", "L"]

    function setupPreRenderTest() {
      // stub render related methods
      chart = MultiSeriesMixin(baseMixin({}))
      chart.stack = () => [{}]
      chart._doRender = () => {}
      chart.generatePopup = () => {}
      chart.dimension = () => ({ value: () => ["date", "party"] })
      chart.group = () => ({})
      // set up mocks and render
      chart.stack = chai.spy(() => [])
      chart.series().selected(selected)
      chart.series().keys([])
    }

    it("should stack the chart n times where n is the number of selected in a series minus one", () => {
      setupPreRenderTest()
      chart.render()
      expect(chart.stack).to.have.been.called.exactly(selected.length + 2)
    })
    it("should stack the chart with other when showOther flag is true", () => {
      setupPreRenderTest()
      chart.showOther(true)
      chart.render()
      expect(chart.stack).to.have.been.called.exactly(selected.length + 3)
    })
    it("should do nothing is chart has already been stacked", () => {
      setupPreRenderTest()
      chart.render()
      chart.render()
      expect(chart.stack).to.have.been.called.exactly(selected.length + 7)
    })
  })
})
