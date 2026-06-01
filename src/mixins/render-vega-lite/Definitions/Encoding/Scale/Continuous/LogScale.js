// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import ContinuousScale from "./ContinuousScale"
import ScaleType from "../Enums/ScaleType"

export default class LogScale extends ContinuousScale {
  /**
   *
   * @param {Object} scale_definition_object
   * @param {ParentInfo} parent_info
   */
  constructor(scale_definition_object, parent_info) {
    super(scale_definition_object, ScaleType.kLog, parent_info)
  }
}
