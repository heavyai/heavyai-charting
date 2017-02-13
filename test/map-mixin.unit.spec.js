import {expect} from "chai"
import * as dc from "../src"

describe("Map Mixin", () => {
  describe("constructor", () => {
    it('should mixin a map chart', () => {
      const mapboxAPI = {
        LngLatBounds: {
          convert: () => {}
        }
      }
      const map = dc.mapMixin(dc.baseMixin({}), 'test', mapboxAPI)
      expect(typeof map.init).to.equal("function")
    })
  })
})
