// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"

describe("Margin Mixin", () => {
  describe("constructor", () => {
    it("should mixin a margin chart", () => {
      dc.marginMixin({})
    })
  })
})
