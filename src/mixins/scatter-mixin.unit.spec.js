import { expect } from "chai"
import * as dc from "../index"
import mapboxglMock from "../../test/mapbox-gl-mock"

describe("Scatter Mixin", () => {
  describe("constructor", () => {
    it("should mixin a scatter", () => {
      dc.scatterMixin({}, mapboxglMock, false)
    })
  })
})
