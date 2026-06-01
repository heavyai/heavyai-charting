// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// /* eslint-disable */

import {
  multipleKeysAccessorForCap,
  multipleKeysAccessorForStack
} from "./multiple-key-accessors"
import { expect } from "chai"

describe("Multiple Key Accessors", () => {
  describe("exports", () => {
    it("should have all the necessary exports", () => {
      expect(typeof multipleKeysAccessorForCap).to.equal("function")
      expect(typeof multipleKeysAccessorForStack).to.equal("function")
    })
  })
})
