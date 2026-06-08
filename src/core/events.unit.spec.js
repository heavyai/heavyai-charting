// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dc from "../index"
import { expect } from "chai"

describe("Events", () => {
  it("should have all the necessary exports", () => {
    expect(typeof dc.events.trigger).to.equal("function")
  })
})
