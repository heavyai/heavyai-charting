// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Number Chart", () => {
  describe("constructor", () => {
    it("should create a number chart", () => {
      const node = window.document.createElement("DIV")
      const number = dc.numberChart(node)
      expect(number.anchor()).to.equal(node)
    })
  })
})
