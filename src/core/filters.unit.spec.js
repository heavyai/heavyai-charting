// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dc from "../index"
import { expect } from "chai"

describe("Filters", () => {
  it("should have all the necessary exports", () => {
    expect(typeof dc.filters.RangedFilter).to.equal("function")
    expect(typeof dc.filters.TwoDimensionalFilter).to.equal("function")
    expect(typeof dc.filters.RangedTwoDimensionalFilter).to.equal("function")
  })
})
