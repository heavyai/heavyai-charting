import {expect} from "chai"
import * as dc from "../src"
import mapboxglMock from "./mapbox-gl-mock"

describe("Scatter Mixin", () => {
  describe("constructor", () => {
    it('should mixin a scatter', () => {
      dc.scatterMixin({}, mapboxglMock)
    })
  })
})
