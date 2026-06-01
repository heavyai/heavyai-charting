// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Stack Mixin", () => {
  describe("constructor", () => {
    it("should mixin a stack chart", () => {
      dc.stackMixin(dc.colorMixin(dc.baseMixin({})))
    })
  })
})
