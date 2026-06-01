// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import boxPlot from "./box-plot"

describe("Box Plot Chart", () => {
  describe("constructor", () => {
    it("should create a box plot chart", () => {
      const node = window.document.createElement("DIV")
      const box = boxPlot(node)
      expect(box.anchor()).to.equal(node)
    })
  })
})
