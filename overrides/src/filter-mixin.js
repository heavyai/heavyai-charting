const hasAllObjects = filter => filter.reduce((a, f) => typeof f === "object" && !(f instanceof Date) && a, true)
const isArrayOfObjects = filter => Array.isArray(filter) && hasAllObjects(filter)

export function addFilterHandler (filters, filter) {
  if (isArrayOfObjects(filter)) {
    filters.push(filter.map(f => f.value))
  } else {
    filters.push(filter);
  }
  return filters;
}

export function hasFilterHandler (filters, filter) {
  if (filter === null || typeof(filter) === 'undefined') {
    return filters.length > 0
  } else {
    filter = filter.map(fs => isArrayOfObjects(fs) ? fs.map(f => f.value) : fs)
    return filters.some(function (f) {
      return filter <= f && filter >= f;
    });
  }

}
