export default function groupAllMixin (dc) {
  let groupAll = null
  let lastFilteredSize = null

  dc.groupAll = function (group) {
    if (!arguments.length) {
      return groupAll
    }

    groupAll = group
    return groupAll
  }

  dc.getLastFilteredSizeAsync = function () {
    return groupAll.valueAsync().then(value => {
      lastFilteredSize = value
      return value
    })
  }

  dc.lastFilteredSize = function () {
    return lastFilteredSize
  }

  return dc
}
