export const ALL_OTHERS_LABEL = "All Others"
export const ALL_OTHERS_COLOR = "#888888"

export function maybeUpdateDomainRange(
  chart,
  data,
  dataAccessor,
  domain,
  range,
  wrapKey = false
) {
  const dataArr = data.map(dataAccessor)
  const domainRangeMap = new Map(domain.map((key, i) => [key, range[i]]))
  const dataMap = new Map(
    dataArr.map((key, i) => [
      key,
      domainRangeMap.get(key) ??
        chart.getColor(wrapKey ? { key0: key } : key, i)
    ])
  )
  chart.customDomain([...dataMap.keys()])
  chart.customRange([...dataMap.values()])
}

export function maybeUpdateAllOthers(chart, data, domain, range) {
  const dataHasAllOthers = data.map(d => d.data.key0).includes(ALL_OTHERS_LABEL)
  const domainHasAllOthers = domain.includes(ALL_OTHERS_LABEL)
  if (dataHasAllOthers && !domainHasAllOthers) {
    domain.push(ALL_OTHERS_LABEL)
    range.push(ALL_OTHERS_COLOR)
  } else if (domainHasAllOthers && !dataHasAllOthers) {
    const index = domain.indexOf(ALL_OTHERS_LABEL)
    domain.splice(index, 1)
    range.splice(index, 1)
  }

  chart.customDomain(domain)
  chart.customRange(range)
}

const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)

  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export const determineColorByValue = (value, colors) => {
  if (typeof value === "string") {
    const hash = cyrb53(value)
    const colorIndex = hash % colors.length
    return colors[colorIndex]
  }
  const colorIndex = value % colors.length
  return colors[colorIndex]
}

export function buildHashedColor(field, range, paletteLength, customColors) {
  if (customColors?.domain?.length > 0 && customColors?.range?.length > 0) {
    const domain = customColors.domain
    // build SQL CASE statement
    let sql = `CASE `
    for (let i = 0; i < domain.length; i++) {
      sql += `WHEN ${field} = '${domain[i]}' THEN ${range.indexOf(
        customColors.range[i]
      )} `
    }
    sql += `ELSE MOD(HASH(${field}), ${paletteLength}) END`
    return sql
  } else {
    return `MOD(HASH(${field}), ${paletteLength})`
  }
}
