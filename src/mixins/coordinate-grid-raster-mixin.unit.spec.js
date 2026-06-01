// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import coordinateGridRasterMixin from "./coordinate-grid-raster-mixin"

describe("coordinateGridRasterMixin", () => {
  let chart = {}

  describe("constructor", () => {
    it("should construct Coordinate Grid Raster Mixin", () => {
      coordinateGridRasterMixin(chart)
    })
  })
  describe("filters", () => {
    it("should a filters method", () => {
      expect(chart.filters().length).to.eq(0)
    })
  })
})
