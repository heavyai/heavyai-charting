// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import dataCount from "./data-count"

describe("Data Count Chart", () => {
  describe("constructor", () => {
    it("should create a data count chart", () => {
      const node = window.document.createElement("DIV")
      const count = dataCount(node)
      expect(count.anchor()).to.equal(node)
    })
  })
})
