// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import DiscreteScale from "./DiscreteScale"
import ScaleType from "../Enums/ScaleType"

export default class OrdinalScale extends DiscreteScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kOrdinal, parent_info)
  }
}
