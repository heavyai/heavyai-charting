// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Geo Choropleth Chart", () => {
  describe("constructor", () => {
    it("should create a geo choropleth chart", () => {
      const node = window.document.createElement("DIV")
      node.setAttribute("id", "test")
      const geo = dc.geoChoroplethChart(node, false, null, {})
      expect(geo.anchor()).to.equal(node)
    })
  })
})
