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
  chart.customDomain(dataMap.keys())
  chart.customRange(dataMap.values())
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
