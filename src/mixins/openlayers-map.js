import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import source from 'ol/source'
import proj from 'ol/proj'
import layer from 'ol/layer'

export function initOpenlayersMap (_chart) {
  const map = new Map({
    target: 'map',
    layers: [
      new layer.Tile({
        source: new source.OSM()
      })
    ],
    view: new View({
      center: proj.fromLonLat([37.41, 8.82]),
      zoom: 4
    })
  });
  return map
}