import chai, {expect} from "chai"
import spies from "chai-spies"
import mapdTable from "../src/mapd-table"
import dc from "../../mapdc"

chai.use(spies)

describe("MapD Table", () => {
  let tableChart
  before(() => {
    const node = window.document.createElement("DIV")
    tableChart = mapdTable(node)
  })
  it("should return a chart that has all the properties of a base mixin chart", () => {
    const baseProperties = Object.keys(dc.baseMixin({}))
    expect(baseProperties.reduce((truthy, prop) => {
      return tableChart.hasOwnProperty(prop) && truthy
    }, true)).to.equal(true)
  })
  describe("getData", () => {
    let dimension = {}
    let group = {}
    let dimValue = []
    const size = 50
    const offset = 0
    const callback = () => {}
    beforeEach(() => {
      dimension.order = chai.spy()
      dimension.topAsync = chai.spy()
      dimension.bottomAsync = chai.spy()
      dimension.value = chai.spy(() => dimValue)
      group.order = chai.spy()
      group.topAsync = chai.spy()
      group.bottomAsync = chai.spy()
      tableChart.group = chai.spy(() => group)
      tableChart.dimension = chai.spy(() => dimension)
      tableChart.sortColumn(null)
    })
    it('should use group when grouped data is true', () => {
      dimValue = [true]
      tableChart.getData(size, offset, callback)
      expect(tableChart.group).to.have.been.called()
      expect(group.topAsync).to.have.been.called()
    })
    it('should use dimension when grouped data is false', () => {
      dimValue = [false]
      tableChart.getData(size, offset, callback)
      expect(dimension.topAsync).to.have.been.called.with(size, offset, callback)
    })
    it('should invoke .bottomAsync() when _sortColumn exists and its order is "asc"', () => {
      tableChart.sortColumn({ order: "asc", col: {name: ""} })
      tableChart.getData(size, offset, callback)
      expect(dimension.bottomAsync).to.have.been.called.with(size, offset, callback)
    })
    it('should invoke .topAsync() when _sortColumn exists and its order is not "asc"', () => {
      tableChart.sortColumn({ order: "desc", col: {name: ""} })
      tableChart.getData(size, offset, callback)
      expect(dimension.topAsync).to.have.been.called.with(size, offset, callback)
    })
    it('should invoke .topAsync() when _sortColumn does not exist', () => {
      tableChart.getData(size, offset, callback)
      expect(dimension.topAsync).to.have.been.called.with(size, offset, callback)
    })
    it('should invoke .order() with null when there is no sortColumn', () => {
      tableChart.getData(size, offset, callback)
      expect(dimension.order).to.have.been.called.with(null)
    })
    it('should invoke .order() with sortColumn.col.name when there is a sortColumn', () => {
      const name = "NAME"
      tableChart.sortColumn({ order: "desc", col: {name } })
      tableChart.getData(size, offset, callback)
      expect(dimension.order).to.have.been.called.with(name)
    })
  })
  describe('setDataAsync', () => {
    const size = 100
    beforeEach(() => {
      tableChart.resetTableStateReturnSize = () => size
      tableChart.getData = chai.spy()
    })
    it('should call getData with the size returned from resetTableStateReturnSize', () => {
      tableChart.dataAsync()
      expect(tableChart.getData).to.have.been.called.with(size)
    })
  })

  describe('addRows', () => {
    let nextOffset
    before(() => {
      nextOffset = tableChart.offset() + tableChart.size()
      tableChart.getData = chai.spy()
      tableChart.addRows()
    })
    it('should set _pauseAutoLoad to true', () => {
      expect(tableChart.pauseAutoLoad()).to.equal(true)
    })
    it('should increment _offset by the _size', () => {
      expect(tableChart.offset()).to.equal(nextOffset)
    })
    it('should call .getData() with the offset, size', () => {
      expect(tableChart.getData).to.have.been.called.with(
        tableChart.size(),
        tableChart.offset() + tableChart.size(),
        tableChart.addRowsCallback
      )
    })

    describe('addRowsCallback', () => {
      describe('when data is empty', () => {
        it('should not call doRedraw', () => {
          tableChart._doRedraw = chai.spy()
          tableChart.addRowsCallback(null, [])
          expect(tableChart._doRedraw).to.have.not.been.called()
        })
      })
      describe('when data is not empty', () => {
        const data = [{}]
        before(() => {
          tableChart._doRedraw = chai.spy()
          tableChart.addRowsCallback(null, data)
        })
        it('should set pauseAutoLoad to false', () => {
          expect(tableChart.pauseAutoLoad()).to.equal(false)
        })
        it('should set dataCache to the dataCache concat with data', () => {
          expect(tableChart.dataCache).to.deep.equal(data)
        })
        it('should call .doRedraw() with the dataCache', () => {
          expect(tableChart._doRedraw).to.have.been.called.with(tableChart.dataCache)
        })
      })
    })
  })
})
