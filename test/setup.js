// Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

var jsdom = require("jsdom").jsdom

var exposedProperties = ["window", "navigator", "document"]

global.document = jsdom("")
global.window = document.defaultView

Object.keys(document.defaultView).forEach(property => {
  if (typeof global[property] === "undefined") {
    exposedProperties.push(property)
    global[property] = document.defaultView[property]
  }
})

global.navigator = {
  userAgent: "node.js"
}
