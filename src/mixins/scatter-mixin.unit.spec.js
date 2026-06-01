// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from "chai"
import * as dc from "../index"
import mapboxglMock from "../../test/mapbox-gl-mock"

describe("Scatter Mixin", () => {
  describe("constructor", () => {
    it("should mixin a scatter", () => {
      dc.scatterMixin({}, mapboxglMock, false)
    })
  })
})
