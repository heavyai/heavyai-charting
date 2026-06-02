// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Pie Chart", () => {
  describe("constructor", () => {
    it("should create a pie chart", () => {
      const node = window.document.createElement("DIV")
      const pie = dc.pieChart(node)
      expect(pie.anchor()).to.equal(node)
    })
  })
})
