import chai, {expect} from "chai"
import spies from "chai-spies"
import countWidget from "../src/count-widget"
import dc from "../../index"
import d3 from "d3"
chai.use(spies)

describe("Count Widget", () => {
  let widget
  beforeEach(() => {
    const node = window.document.createElement("DIV")
    widget = countWidget(node)
  })
  describe("getTotalRecordsAsync", () => {
    it("should resolve promise if .tot() returns a value", function(done) {
      const tot = 100
      widget.tot(100)
      widget.dimension = chai.spy()
      return widget.getTotalRecordsAsync().then(() => {
        expect(widget.dimension).to.have.not.been.called()
        done()
      })
    })
    it("should get sizeAsync and set .tot() to the return if .tot() has no value", function(done) {
      const tot = 100
      widget.dimension = () => ({
        sizeAsync: () => new Promise(resolve => resolve(tot))
      })
      return widget.getTotalRecordsAsync().then(() => {
        expect(widget.tot()).to.equal(tot)
        done()
      })
    })
  })
  describe("setDataAsync", () => {
    let oldLasFilteredSize
    before(() => {
      oldLasFilteredSize = dc.lastFilteredSize
      dc.lastFilteredSize = (id) => false
    })
    after(() => {
      dc.lastFilteredSize = oldLasFilteredSize
    })
    it("should getTotalRecordsAsync and then valueAsync", function (done) {
      const value = 100
      dc.lastFilteredSize = (id) => undefined
      let callback
      let spy = chai.spy()
      widget.tot(value)
      widget.group({
        valueAsync: () => new Promise(resolve => resolve(value)),
        getCrossfilterId: () => 0
      })
      return widget.dataAsync(spy).then(() => {
        expect(spy).to.have.been.called.with(null, value)
        done()
      })
    })
    it("should handle failure case", function(done) {
      dc.lastFilteredSize = (id) => undefined
      const error = 'ERROR'
      let callback
      let spy = chai.spy()
      widget.tot(100)
      widget.group({
        valueAsync: () => new Promise(reject => reject(error)),
        getCrossfilterId: () => 0
      })
      return widget.dataAsync(spy).then(() => {
        expect(spy).to.have.been.called.with(error)
        done()
      })
    })
    it('should use dc.lastFilteredSize() if it exists', function (done) {
      const value = 100
      dc.lastFilteredSize = (id) => value
      const callback = chai.spy()
      widget.tot(value)
      widget.group({
        getCrossfilterId: () => 0
      })
      return widget.dataAsync(callback).then(() => {
        expect(callback).to.have.been.called.with(null, value)
        done()
      })
    })
  })
  describe("_doRender", () => {
    it("should set count-all span to formated tot", () => {
      const tot = 100
      widget.tot(100)
      widget._doRender(50)
      expect(widget.root().select('.count-all').text()).to.equal(tot.toString())
    })
    it("should set count-selected span to formated val", () => {
      const value = 100
      widget.tot(100)
      widget._doRender(value)
      expect(widget.root().select('.count-selected').text()).to.equal(value.toString())
    })
  })
})
