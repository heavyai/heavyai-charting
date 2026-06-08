// SPDX-FileCopyrightText: Copyright (c) 2026, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export default class PropertyDefinition {
  /**
   *
   * @param {string} prop_name
   * @param {Object} prop_definition
   */
  constructor(prop_name, prop_definition) {
    this._prop_name = prop_name
    this._prop_definition = prop_definition
  }

  /**
   * @returns {string}
   */
  get prop_name() {
    return this._prop_name
  }

  /**
   * @returns {object}
   */
  get prop_definition() {
    return this._prop_definition
  }
}
