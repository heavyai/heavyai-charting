// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import multipleKeyLabelMixin from "./multiple-key-label-mixin"

describe("multipleKeyLabelMixin", () => {
  let chart

  beforeEach(() => {
    chart = {
      label: () => null
    }
  })

  describe("constructor", () => {
    it("should construct multipleKeyLabelMixin", () => {
      multipleKeyLabelMixin(chart)
    })
  })
})
