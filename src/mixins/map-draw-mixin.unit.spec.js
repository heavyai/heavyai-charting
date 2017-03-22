// import chai, {expect} from "chai"
// import spies from "chai-spies"
// import {mapDrawMixin} from "../src/map-draw-mixin"
// import dc from "../../index"
//
// const listeners = {}
//
// const map = {
//   on: (event, listener) => {
//     listeners[event] = listener
//   },
//   addControl: chai.spy(),
//   boxZoom: {
//     enable: () => {}
//   }
// }
//
// function createChartWithDrawContext (Draw) {
//   return mapDrawMixin({
//     _invokeFilteredListener: () => {},
//     map: () => map
//   }, {
//     Draw: () => Draw
//   })
// }
//
// describe("Map Draw Mixin", () => {
//   describe("addDrawControl", () => {
//     it('should add draw control to map', () => {
//       const chart = createChartWithDrawContext({})
//       chart.addDrawControl()
//       expect(map.addControl).to.have.been.called.with({})
//       expect(chart.addDrawControl()).to.equal(chart)
//     })
//   })
//
//   describe("drawEventHandler", () => {
//     it('should clear filter if there are no features', () => {
//       const filter = chai.spy()
//       const chart = createChartWithDrawContext({
//         getAll: () => ({ features: [] }),
//         getMode: () => ''
//       })
//       chart.addDrawControl()
//       chart.coordFilter({filter})
//       listeners['draw.create']()
//       expect(filter).to.have.been.called()
//     })
//     it('should create SQL filter from features', () => {
//       const features = [
//         {
//           "id": "277994aececf1a182a91fb5d64029a7a",
//           "type": "Feature",
//           "properties": {},
//           "geometry": {
//             "coordinates": [
//               [
//                 [
//                   -84.023438,
//                   51.483925
//                 ],
//                 [
//                   -40.429688,
//                   22.069062
//                 ],
//                 [
//                   -124.453125,
//                   -9.661713
//                 ],
//                 [
//                   -128.320313,
//                   29.958472
//                 ],
//                 [
//                   -84.023438,
//                   51.483925
//                 ]
//               ]
//             ],
//             "type": "Polygon"
//           }
//         }
//       ]
//       const filter = chai.spy()
//       const chart = createChartWithDrawContext({
//         getAll: () => ({ features }),
//         getMode: () => ''
//       })
//       chart.addDrawControl()
//       chart.coordFilter({filter})
//       chart.xDim = () => ({ value: () => ['lon'] })
//       chart.yDim = () => ({ value: () => ['lat'] })
//       listeners['draw.create']()
//       expect(filter).to.have.been.called.with(
//         "(UNLIKELY( lon >= -128.320313 AND lon <= -40.429688 AND lat >= -9.661713 AND lat <= 51.483925)) AND (lon IS NOT NULL AND lat IS NOT NULL AND (((((lon)-(-84.023438))*((22.069062)-(51.483925)) - ((-40.429688)-(-84.023438))*((lat)-(51.483925)) < 0.0) = (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0))) AND (((lon)-(-128.320313))*((51.483925)-(29.958472)) - ((-84.023438)-(-128.320313))*((lat)-(29.958472)) < 0.0) = (((lon)-(-40.429688))*((29.958472)-(22.069062)) - ((-128.320313)-(-40.429688))*((lat)-(22.069062)) < 0.0) OR (((((lon)-(-124.453125))*((29.958472)-(-9.661713)) - ((-128.320313)-(-124.453125))*((lat)-(-9.661713)) < 0.0) = (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0))) AND (((lon)-(-40.429688))*((-9.661713)-(22.069062)) - ((-124.453125)-(-40.429688))*((lat)-(22.069062)) < 0.0) = (((lon)-(-128.320313))*((22.069062)-(29.958472)) - ((-40.429688)-(-128.320313))*((lat)-(29.958472)) < 0.0 OR (lat/2 = 0)))"
//       )
//     })
//     it('should call redrawAllAsync', () => {
//       expect(dc.redrawAllAsync).to.have.been.called()
//     })
//   })
//   describe("changeDrawMode", () => {
//     it('should set draw mode true if mode is draw_polygon', () => {
//       const filter = chai.spy()
//       const chart = createChartWithDrawContext({
//         getAll: () => ({ features: [] }),
//         getSelected: () => ({ features: [] }),
//         getMode: () => 'draw_polygon'
//       })
//       chart.addDrawControl()
//       chart.coordFilter({filter})
//       listeners['draw.delete']()
//       expect(chart.drawMode()).to.equal(true)
//     })
//     it('should set draw mode false if mode is not draw_polygon and none are selected', () => {
//       const filter = chai.spy()
//       const chart = createChartWithDrawContext({
//         getAll: () => ({ features: [] }),
//         getSelected: () => ({ features: [] }),
//         getMode: () => 'delete'
//       })
//       chart.addDrawControl()
//       chart.coordFilter({filter})
//       listeners['draw.delete']()
//       expect(chart.drawMode()).to.equal(false)
//     })
//   })
// })
