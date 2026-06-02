// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import barChart from "./bar-chart"

describe("Bar Chart", () => {
  describe("constructor", () => {
    it("should create a bar chart", () => {
      const node = window.document.createElement("DIV")
      const bar = barChart(node)
      expect(bar.anchor()).to.equal(node)
    })
  })
})
