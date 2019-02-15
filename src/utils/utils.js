import { createParser } from "mapd-data-layer-2"
import { formatDataValue, maybeFormatInfinity } from "./formatting-helpers"

import { DAYS, HOURS, MONTHS, QUARTERS } from "../constants/dates-and-times"

import deepEqual from "fast-deep-equal"

import d3 from "d3"
import { constants } from "../core/core"

export const parser = createParser()

function hexBinSQL(sql, { width, height, mark, x, y, aggregate }, parser) {
  const hexoffsetx = 0
  const hexoffsety = 0

  const heximgwidth = width
  const heximgheight = height

  let hexminmercx = x.domain[0]
  let hexmaxmercx = x.domain[1]
  let hexminmercy = y.domain[0]
  let hexmaxmercy = y.domain[1]

  if (hexoffsetx) {
    const mercxdiff = hexoffsetx * (hexmaxmercx - hexminmercx) / heximgwidth
    hexminmercx = hexminmercx - mercxdiff
    hexmaxmercx = hexmaxmercx - mercxdiff
  }

  if (hexoffsety) {
    const mercydiff = hexoffsety * (hexmaxmercy - hexminmercy) / heximgheight
    hexminmercy = hexminmercy - mercydiff
    hexmaxmercy = hexmaxmercy - mercydiff
  }

  const args =
    `${parser.parseExpression(x.field)},` +
    `${hexminmercx},` +
    `${hexmaxmercx},` +
    `${parser.parseExpression(y.field)},` +
    `${hexminmercy},` +
    `${hexmaxmercy},` +
    `${mark.width},` +
    `${mark.height},` +
    `${hexoffsetx},` +
    `${hexoffsety},` +
    `${width},` +
    `${height}`

  sql.select.push(`reg_${mark.shape}_horiz_pixel_bin_x(${args}) as x`)
  sql.select.push(`reg_${mark.shape}_horiz_pixel_bin_y(${args}) as y`)
  sql.select.push(`${parser.parseExpression(aggregate)} as color`)
  sql.groupby.push("x")
  sql.groupby.push("y")

  return sql
}

function rectBinSQL(sql, { width, height, mark, x, y, aggregate }, parser) {
  sql.select.push(
    `rect_pixel_bin_x(${parser.parseExpression(x.field)}, ${x.domain[0]}, ${
      x.domain[1]
    }, ${mark.width}, 0, ${width}) as x`
  )
  sql.select.push(
    `rect_pixel_bin_y(${parser.parseExpression(y.field)}, ${y.domain[0]}, ${
      y.domain[1]
    }, ${mark.height}, 0, ${height}) as y`
  )
  sql.select.push(`${parser.parseExpression(aggregate)} as color`)
  sql.groupby.push("x")
  sql.groupby.push("y")

  return sql
}

parser.registerParser(
  {
    meta: "transform",
    type: "pixel_bin"
  },
  (sql, transform, parser) => {
    switch (transform.mark.shape) {
      case "hex":
        return hexBinSQL(sql, transform, parser)
      case "square":
        return rectBinSQL(sql, transform, parser)
      default:
        return sql
    }
  }
)

parser.registerParser(
  {
    meta: "transform",
    type: "rowid"
  },
  (sql, transform) => {
    const rowid = transform.table + ".rowid"
    sql.select.push(rowid)
    sql.groupby.push(rowid)
    return sql
  }
)

export const dateFormat = d3.time.format.utc("%m/%d/%Y")

export const deepEquals = require("fast-deep-equal") // eslint-disable-line global-require

export const deepClone = obj => JSON.parse(JSON.stringify(obj))

export const TIME_UNITS = {
  DATE: true,
  TIMESTAMP: true,
  date: true,
  datetime: true,
  timestamp: true,
  "timestamp without timezone": true,
  TIME: true
}

/* istanbul ignore next */
export const customTimeFormat = d3.time.format.utc.multi([
  [".%L", d => d.getUTCMilliseconds()],
  [":%S", d => d.getUTCSeconds()],
  ["%I:%M", d => d.getUTCMinutes()],
  ["%I %p", d => d.getUTCHours()],
  ["%a %d", d => d.getUTCDay() && d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b %d", d => d.getUTCDate() != 1], // eslint-disable-line eqeqeq
  ["%b", d => d.getUTCMonth()],
  ["%Y", () => true]
])

export function extractTickFormat(timeBin) {
  return tick => {
    switch (timeBin) {
      case "year":
        return Math.ceil(tick)
      case "isodow":
        return DAYS[tick - 1]
      case "month":
        return MONTHS[tick - 1]
      case "quarter":
        return QUARTERS[tick - 1]
      case "hour":
      case "minute":
        return tick + 1
      default:
        return tick
    }
  }
}

export function xDomain(extract, currentLowValue, currentHighValue, timeBin) {
  if (extract) {
    switch (timeBin) {
      case "year":
        return [currentLowValue.getFullYear(), currentHighValue.getFullYear()]
      case "quarter":
        return [1, 4] // eslint-disable-line no-magic-numbers
      case "isodow":
        return [1, 7] // eslint-disable-line no-magic-numbers
      case "month":
        return [1, 12] // eslint-disable-line no-magic-numbers
      case "day":
        return [1, 31] // eslint-disable-line no-magic-numbers
      case "hour":
        return [0, 23] // eslint-disable-line no-magic-numbers
      case "minute":
        return [0, 59] // eslint-disable-line no-magic-numbers
      default:
        return [1, 7] // eslint-disable-line no-magic-numbers
    }
  } else {
    return [currentLowValue, currentHighValue]
  }
}

export function xScale(extract, isChartDate) {
  if (extract || !isChartDate) {
    return d3.scale.linear()
  } else {
    return d3.time.scale.utc()
  }
}

export function xAxisTickFormat({ extract, timeBin }, isChartDate) {
  if (extract) {
    return utils.extractTickFormat(timeBin)
  } else if (isChartDate) {
    return customTimeFormat
  } else {
    return d3.format(".2s")
  }
}

export const printers = {}

printers.filters = function(filters) {
  let s = ""

  for (let i = 0; i < filters.length; ++i) {
    if (i > 0) {
      s = s + ", "
    }
    s = s + printers.filter(filters[i])
  }

  return s
}

printers.filter = function(filter) {
  let s = ""

  if (typeof filter !== "undefined" && filter !== null) {
    if (filter instanceof Array) {
      if (filter.length >= 2) {
        s =
          "[" +
          utils.printSingleValue(filter[0]) +
          " -> " +
          utils.printSingleValue(filter[1]) +
          "]"
      } else if (filter.length >= 1) {
        s = utils.printSingleValue(filter[0])
      }
    } else {
      s = utils.printSingleValue(filter)
    }
  }

  return s
}

export const pluck = (n, f) => {
  if (!f) {
    return function(d) {
      return d[n]
    }
  }
  return function(d, i) {
    return f.call(d, d[n], i)
  }
}

export const utils = {}

utils.printSingleValue = function(filter) {
  let s = String(filter)

  if (filter instanceof Date) {
    s = dateFormat(filter)
  } else if (typeof filter === "string") {
    s = filter
  } else if (utils.isFloat(filter)) {
    s = utils.printSingleValue.fformat(filter)
  } else if (utils.isInteger(filter)) {
    s = Math.round(filter)
  }

  return s
}
utils.printSingleValue.fformat = d3.format(".2f")

// FIXME: these assume than any string r is a percentage (whether or not it
// includes %).
utils.add = function(l, r, c) {
  if (typeof r === "string") {
    r = r.replace("%", "")
  }

  if (l instanceof Date) {
    if (typeof r === "string") {
      r = Number(r)
    }
    const d = new Date()
    d.setTime(l.getTime())
    d.setDate(l.getDate() + r)
    return d
  } else if (typeof r === "string") {
    const percentage = Number(r) / 100
    return l + c * percentage
  } else {
    return l + r
  }
}

utils.subtract = function(l, r, c) {
  if (typeof r === "string") {
    r = r.replace("%", "")
  }

  if (l instanceof Date) {
    if (typeof r === "string") {
      r = Number(r)
    }
    const d = new Date()
    d.setTime(l.getTime())
    d.setDate(l.getDate() - r)
    return d
  } else if (typeof r === "string") {
    const percentage = Number(r) / 100
    return l - c * percentage
  } else {
    return l - r
  }
}

utils.isNumber = function(n) {
  return n === Number(n)
}

utils.isFloat = function(n) {
  return n === Number(n) && n !== (n | 0)
}

utils.isInteger = function(n) {
  return n === Number(n) && n === (n | 0)
}

utils.isNegligible = function(n) {
  return (
    !utils.isNumber(n) ||
    (n < constants.NEGLIGIBLE_NUMBER && n > -constants.NEGLIGIBLE_NUMBER)
  )
}

utils.clamp = function(val, min, max) {
  return val < min ? min : val > max ? max : val
}

let _idCounter = 0
utils.uniqueId = function() {
  return ++_idCounter
}

utils.nameToId = function(name) {
  if (parseFloat(name)) {
    return name
  } else {
    return name
      .toLowerCase()
      .replace(/[\s]/g, "_")
      .replace(/[\.']/g, "")
  }
}

utils.appendOrSelect = function(parent, selector, tag) {
  tag = tag || selector
  let element = parent.select(selector)
  if (element.empty()) {
    element = parent.append(tag)
  }
  return element
}

utils.safeNumber = function(n) {
  return utils.isNumber(Number(n)) ? Number(n) : 0
}

utils.b64toBlob = function(b64Data, contentType, sliceSize) {
  contentType = contentType || ""
  sliceSize = sliceSize || 512

  const byteCharacters = atob(b64Data)
  const byteArrays = []

  for (
    let offset = 0;
    offset < byteCharacters.length;
    offset = offset + sliceSize
  ) {
    const slice = byteCharacters.slice(offset, offset + sliceSize)

    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)

    byteArrays.push(byteArray)
  }

  const blob = new Blob(byteArrays, { type: contentType })
  return blob
}

utils.getFontSizeFromWidth = function(text, chartWidth, chartHeight) {
  const BASE_FONT_SIZE = 12
  const MIN_FONT_SIZE = 4
  const tmpText = d3.select("body").append("span")
    .attr("class", "tmp-text")
    .style("font-size", BASE_FONT_SIZE + "px")
    .style("position", "absolute")
    .style("opacity", 0)
    .style("margin-right", 10000)
    .html(text)
  const node = tmpText.node()

  let textWidth = null
  let textHeight = null
  if (node.getBoundingClientRect) {
    const bbox = node.getBoundingClientRect()
    textWidth = bbox.width
    textHeight = bbox.height
  }

  tmpText.remove()

  const fontSizeWidth = BASE_FONT_SIZE * chartWidth / textWidth
  const fontSizeHeight = BASE_FONT_SIZE * chartHeight / textHeight

  return Math.max(Math.min(fontSizeWidth, fontSizeHeight), MIN_FONT_SIZE)
}

utils.isOrdinal = function(type) {
  const BOOL_TYPES = { BOOL: true }

  const TEXT_TYPES = {
    varchar: true,
    text: true,
    STR: true
  }

  const TEXT_AND_BOOL_TYPES = Object.assign({}, TEXT_TYPES, BOOL_TYPES)

  return type in TEXT_AND_BOOL_TYPES
}

utils.isQuantitative = function(type) {
  const NUMERICAL_INTEGER_TYPES = {
    int2: true,
    int4: true,
    int8: true,
    SMALLINT: true,
    INT: true,
    BIGINT: true
  }

  const NUMERICAL_REAL_TYPES = {
    FLOAT: true,
    DOUBLE: true,
    DECIMAL: true
  }

  const NONCUSTOM_NUMERICAL_TYPES = Object.assign(
    {},
    NUMERICAL_INTEGER_TYPES,
    NUMERICAL_REAL_TYPES
  )

  return type in NONCUSTOM_NUMERICAL_TYPES
}

utils.deepEquals = deepEqual
utils.customTimeFormat = customTimeFormat
utils.extractTickFormat = extractTickFormat
utils.formatValue = formatDataValue
utils.maybeFormatInfinity = maybeFormatInfinity

utils.nullsFirst = function(sorting) {
  return (a, b) => {
    if (a === null) {
      return -1
    } else if (b === null) {
      return 1
    }

    return sorting(a, b)
  }
}

utils.nullsLast = function(sorting) {
  return (a, b) => {
    if (a === null) {
      return 1
    } else if (b === null) {
      return -1
    }

    return sorting(a, b)
  }
}
