import {expect} from "chai"
import * as dc from "../src"
import mapboxglMock from "./mapbox-gl-mock"

describe("Map Mixin", () => {
  describe("constructor", () => {
    it('should mixin a map chart', () => {
      const map = dc.mapMixin(dc.baseMixin({}), 'test', mapboxglMock, {})
      expect(typeof map.init).to.equal("function")
    })
  })
})
