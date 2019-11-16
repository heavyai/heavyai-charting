export function initMapboxMap(_chart, _mapboxAccessToken, mapboxgl) {

  const _mapboxgl = typeof mapboxgl === "undefined" ? mapboxgl : _mapboxgl

  _mapboxgl.accessToken = _mapboxAccessToken

  _chart
    .root()
    .style("width", _chart.width() + "px")
    .style("height", _chart.height() + "px")

  const map = new _mapboxgl.Map({
    container: _mapId, // container id
    style: _mapStyle,
    interactive: true,
    center: _center, // starting positions
    zoom: _zoom, // starting zoom
    maxBounds: _llb,
    preserveDrawingBuffer: true,
    attributionControl: false,
    logoPosition: "bottom-right"
  })

  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()
  map.addControl(new _mapboxgl.NavigationControl(), "bottom-right")
  map.addControl(new _mapboxgl.AttributionControl(), _attribLocation)
  map.addControl(
    new _mapboxgl.ScaleControl({ maxWidth: 80, unit: "metric" }),
    "bottom-right"
  )
  _chart.addMapListeners()


  return map
}