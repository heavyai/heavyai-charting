import * as MapboxDraw from '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw'
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points'
import { activeStates } from '@mapbox/mapbox-gl-draw/src/constants'

const DirectSelectWithoutMiddleVertexMode = { ...MapboxDraw.modes.direct_select }

DirectSelectWithoutMiddleVertexMode.toDisplayFeatures = function (state, geojson, push) {
  if (state.featureId === geojson.properties.id) {
    geojson.properties.active = activeStates.ACTIVE
    push(geojson)
    createSupplementaryPoints(geojson, {
      map: this.map,
      midpoints: false,
      selectedPaths: state.selectedCoordPaths
    }).forEach(push)
  } else {
    geojson.properties.active = activeStates.INACTIVE
    push(geojson)
  }
  this.fireActionable(state)
}

export default DirectSelectWithoutMiddleVertexMode
