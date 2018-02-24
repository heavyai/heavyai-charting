import { expect } from "chai"
import * as dc from "../index"
import mapboxglMock from "../../test/mapbox-gl-mock"

describe("Map Mixin", () => {
  describe("constructor", () => {
    it("should mixin a map chart", () => {
      const map = dc.mapMixin(dc.baseMixin({}), "test", mapboxglMock, false)
      expect(typeof map.init).to.equal("function")
    })
  })
})
