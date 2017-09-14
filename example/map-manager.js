export default function MapManager () {
  const MAP_STYLE = "mapbox://styles/mapbox/light-v8"

  let map
  function init () {
    mapboxgl.accessToken = "pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a2Zza2IwaXY5dThtMDU2bm5xdTQ1In0.U7vvTzg4HBgUGAB_sy0xhw"
    map = new mapboxgl.Map({
      container: "heatmap",
      style: MAP_STYLE,
      center: [0, 0],
      zoom: 1
    })
    return this
  }

  function addImage (image) {
    const layerID = "heatmap-layer"
    map.addSource(layerID, {
      type: "image",
      url: image,
      coordinates: [
        [-140.62499999999727, 78.20821441497228],
        [140.62499999999682, 78.20821441497228],
        [140.62499999999682, -55.573776964414854],
        [-140.62499999999727, -55.573776964414854]
      ]
    })

    map.addLayer({
      id: layerID,
      source: layerID,
      type: "raster",
      paint: {"raster-opacity": 0.5, "raster-fade-duration": 0}
    })
    return this
  }

  function getMap () {
    return map
  }

  return {
    init,
    getMap,
    addImage
  }
}