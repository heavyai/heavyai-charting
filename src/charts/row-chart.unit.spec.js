// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Row Chart", () => {
  describe("constructor", () => {
    it("should create a row chart", () => {
      const node = window.document.createElement("DIV")
      const row = dc.rowChart(node)
      expect(row.anchor()).to.equal(node)
    })
  })
})
