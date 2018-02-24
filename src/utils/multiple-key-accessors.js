import { isArrayOfObjects } from "../../src/utils/formatting-helpers"

const INDEX_NONE = -1
const identity = a => a

function normalize(data) {
  if (isArrayOfObjects(data)) {
    return data.map(d => d.value)
  } else {
    return data
  }
}

function getMinOfRange(d) {
  if (Array.isArray(d)) {
    return d[0]
  } else {
    return d
  }
}

function createAccessor(transform = identity) {
  return function multipleKeyAccessor(d) {
    let filteredKeys = []
    for (const key in d) {
      if (d.hasOwnProperty(key) && key.indexOf("key") > INDEX_NONE) {
        filteredKeys.push(transform(normalize(d[key])))
      }
    }
    if (filteredKeys.length === 1) {
      filteredKeys = filteredKeys[0]
    }
    return filteredKeys
  }
}

export const multipleKeysAccessorForCap = createAccessor()
export const multipleKeysAccessorForStack = createAccessor(getMinOfRange)
