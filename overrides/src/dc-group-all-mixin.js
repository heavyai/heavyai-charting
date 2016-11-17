export default function groupAllMixin (dc) {
  let groupAll = {}
  let lastFilteredSize = {}

  dc.groupAll = function (group) {
    if (!arguments.length) {
      for (var key in groupAll) {
        if (groupAll.hasOwnProperty(key)) {
          return groupAll;
        }
      }
      return null;
    }

    groupAll[group.getCrossfilterId()] = group;
    return groupAll
  }

  dc.getLastFilteredSizeAsync = function (arg) {
    var keyArray = [];
    var crossfilterId;
    if (typeof arg === "number") {
      crossfilterId = arg;
    } else if (typeof arg === "object" && typeof arg.getCrossfilterId === "function") {
      crossfilterId = arg.getCrossfilterId();
    }

    if (crossfilterId !== undefined) {
      let group = groupAll[crossfilterId];
      if (group) {
        return group.valueAsync().then(value => {
          lastFilteredSize[crossfilterId] = value;
          return value;
        })
      } else {
        return new Promise(reject => reject("The group with crossfilterId " + crossfilterId + " is not an active groupAll() group"));
      }
    } else if (arg) {
      return new Promise(reject => reject("The argument to getLastFilteredSizeAsync must be a crossfilterId or a group/groupAll object, or call getLastFilteredSizeAsync without an argument to calculate all groupAlls"))
    }

    return Promise.all(Object.keys(groupAll).map(function(key) {
      keyArray.push(key);
      return groupAll[key].valueAsync();
    })).then(values => {
      for (var i=0; i<values.length; ++i) {
        lastFilteredSize[keyArray[i]] = values[i];
      }
    });
  }

  dc.lastFilteredSize = function (crossfilterId) {
    return lastFilteredSize[crossfilterId]
  }

  return dc
}
