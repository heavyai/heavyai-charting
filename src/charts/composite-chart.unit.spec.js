// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import compositeChart from "./composite-chart"

describe("Composite Chart", () => {
  describe("constructor", () => {
    it("should create a composite chart", () => {
      const node = window.document.createElement("DIV")
      const composite = compositeChart(node)
      expect(composite.anchor()).to.equal(node)
    })
  })
})
