// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dc from "../index"
import { expect } from "chai"

describe("Errors", () => {
  it("should export an Exception class", () => {
    expect(typeof dc.errors.Exception).to.equal("function")
  })

  it("should export an InvalidStateException class", () => {
    expect(typeof dc.errors.InvalidStateException).to.equal("function")
  })

  it("should export an BadArgumentException class", () => {
    expect(typeof dc.errors.BadArgumentException).to.equal("function")
  })
})
