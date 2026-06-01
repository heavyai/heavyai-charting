// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import bubbleOverlay from "./bubble-overlay"

describe("Bubble Overlay", () => {
  describe("constructor", () => {
    it("should create a bubble overlay", () => {
      const node = window.document.createElement("DIV")
      const bubble = bubbleOverlay(node)
      expect(bubble.anchor()).to.equal(node)
    })
  })
})
