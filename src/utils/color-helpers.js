export function maybeUpdateDomainRange(
  chart,
  data,
  dataAccessor,
  domain,
  range,
  wrapKey = false
) {
  const dataArr = data.map(dataAccessor)
  const domainRangeMap = new Map([...domain].map((key, i) => [key, range[i]]))
  console.log("domainRangeMap", domainRangeMap)
  const dataMap = new Map(
    [...dataArr].map((key, i) => [
      key,
      domainRangeMap.get(key) ??
        chart.getColor(wrapKey ? { key0: key } : key, i)
    ])
  )
  console.log("dataMap", dataMap)
  chart.customDomain([...dataMap.keys()])
  chart.customRange([...dataMap.values()])
}

export function maybeUpdateAllOthers(chart, data, domain, range) {
  if (
    data.map(d => d.data.key0).includes("All Others") &&
    !domain.includes("All Others")
  ) {
    domain.push("All Others")
    range.push("#888888")
  } else if (
    domain.includes("All Others") &&
    !data.map(d => d.data.key0).includes("All Others")
  ) {
    const index = domain.indexOf("All Others")
    domain.splice(index, 1)
    range.splice(index, 1)
  }

  chart.customDomain(domain)
  chart.customRange(range)
}
