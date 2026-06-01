// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Bubble Mixin", () => {
  describe("constructor", () => {
    it("should create a chart", () => {
      dc.bubbleMixin({
        data: () => {},
        renderLabel: () => {},
        setDataAsync: () => {}
      })
    })
  })
})
