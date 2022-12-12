import * as HeavyConnect from "@heavyai/connector"
import * as HeavyCrossfilter from "@heavyai/crossfilter"
import * as HeavyCharting from "../src/index.js"

function createCharts(crossFilter, dc, config, con) {
  const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
  const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 100
  
  // Linemap Chart
  const parent = document.getElementById("contourChart");
  const mapboxToken = "pk.eyJ1IjoibWFwZCIsImEiOiJjaWV1a3NqanYwajVsbmdtMDZzc2pneDVpIn0.cJnk8c2AxdNiRNZWtx5A9g";
  
  const countGroup = crossFilter.groupAll();
  
  dc.countWidget(".data-count")
  .dimension(crossFilter)
  .group(countGroup);
  
  const ContourChart = dc.rasterChart(parent, true, null, mapboxgl)
  .con(con)
  .height(h)
  .width(w)
  .mapUpdateInterval(750)
  .mapStyle('mapbox://styles/mapbox/light-v8')
  .mapboxToken(mapboxToken) // need a mapbox accessToken for loading the tiles
  .popupSearchRadius(2)
  .useGeoTypes(true) // need for projecting geo column using "mercator_map_projection"
  
  const isMajorFieldName = "is_major"
  
  const contourPolygonLayer = dc.rasterLayer("polys")
  .crossfilter(crossFilter)
  .setState({
    data: [
      {
        type: "contour",
        table: config.table,
        source: config.table,
        contour_value_field: config.value,
        lat_field: config.lat_field,
        lon_field: config.lon_field,
        agg_type: 'AVG',
        fill_agg_type: 'AVG',
        bin_dim_meters: config.bin_dim_meters,
        neighborhood_fill_radius: 0,
        fill_only_nulls: false,
        flip_latitude: false,
        contour_offset: 0,
        intervals: {
          isMajorFieldName,
          major: config.major_contour_interval,
          minor: config.minor_contour_interval
        }
      }
    ],
    transform: {
      projection: "mercator_map_projection",
    },
    mark: {
      type: "poly",
      strokeColor: "white",
      strokeWidth: 0,
      fillColor: "",
      lineJoin: "miter",
      miterLimit: 10
    },
    encoding: {
      geocol: "contour_polygons",
      color: {
        type: "linear",
        domain: [0, 6000],
        range: ["#FF0000", "#0000FF"],
        opacity: 0.50
      }
    },
    enableHitTesting: false
  })
  // .popupColumns(["contour_values"])
  // .popupColumnsMapped({"contour_values": "Contour Value"})

  const contourLayer = dc.rasterLayer("lines")
  .crossfilter(crossFilter)
  .setState({
    data: [{
      type: "contour",
      table: config.table,
      source: config.table,
      contour_value_field: config.value,
      lat_field: config.lat_field,
      lon_field: config.lon_field,
      agg_type: 'AVG',
      fill_agg_type: 'AVG',
      bin_dim_meters: config.bin_dim_meters,
      neighborhood_fill_radius: 0,
      fill_only_nulls: false,
      flip_latitude: false,
      contour_offset: 0,
      intervals: {
        isMajorFieldName,
        major: config.major_contour_interval,
        minor: config.minor_contour_interval
      }
    }],
    transform: {
      projection: "mercator_map_projection",
    },
    mark: {
      type: "lines",
      lineJoin: "bevel",
    },
    encoding: {
      geocol: "contour_lines",
      color: {
        field: isMajorFieldName,
        type: "nominal",
        scale: { 
          domain: [false, true], 
          range: ["#666666", "#666666"] 
        }
      },
      strokeWidth: {
        field: isMajorFieldName,
        type: "nominal", 
        scale: { 
          domain: [false, true], 
          range: [1, 2] 
        } 
      },
      opacity: {
        field: isMajorFieldName,
        type: "nominal",
        scale: { 
          domain: [false, true], 
          range: [0.75, 0.8] 
        } 
      }
    },
    enableHitTesting: true
  })
  .popupColumns(["contour_values"])
  .popupColumnsMapped({"contour_values": "Contour Value"})
  .popupStyle({
    fillColor: "#cccccc",
    strokeColor: "#cccccc",
    strokeWidth: 1
  })
  
  ContourChart
  .pushLayer("contourPolygonLayer", contourPolygonLayer)
  .pushLayer("contourLayer", contourLayer)
  .init()
  .then((chart) => {
    // This will zoom to data extent
    chart.zoomToLocation({
      bounds: {
        sw: [-109.5400307407924, 36.77053773368342],
        ne: [-101.56912902650292, 41.34207288081009]
      }
    })
    
    dc.renderAllAsync()
    
    // hover effect with popup
    function displayPopupWithData (event) {
      chart.getClosestResult(event.point, chart.displayPopup)
    }
    const debouncedPopup = _.debounce(displayPopupWithData, 250)
    chart.map().on('mousewheel', () => chart.hidePopup());
    chart.map().on('mousemove', () => chart.hidePopup())
    chart.map().on('mousemove', debouncedPopup)
  })
  
  
  window.addEventListener("resize", _.debounce(resizeAll, 100));
  
  function resizeAll(){
    const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 100
    
    ContourChart.map().resize();
    ContourChart.isNodeAnimate = false;
    ContourChart
    .width(w)
    .height(h)
    .render()
    
    dc.redrawAllAsync();
  }
  
}

function init() {
  const coloradoDEMConfig = {
    table: "colorado_dem",
    lat_field: "raster_lat",
    lon_field: "raster_lon",
    value: "z",
    bin_dim_meters: 90,
    minor_contour_interval: 100,
    major_contour_interval: 500
  }
  
  const nwsPrecipitationConfig = {
    table: "nws_precip_last7days_20221005_conus",
    lat_field: "raster_lat",
    lon_field: "raster_lon",
    value: "band_1_1",
    bin_dim_meters: 10000,
    minor_contour_interval: 1,
    major_contour_interval: 3
  }
  
  const nwsPercentageOfNormalConfig = {
    table: "nws_precip_last7days_20221005_conus",
    lat_field: "raster_lat",
    lon_field: "raster_lon",
    value: "band_1_4",
    bin_dim_meters: 10000,
    minor_contour_interval: 100,
    major_contour_interval: 500
  }
  
  const config = coloradoDEMConfig;


  new HeavyConnect.DbCon()
  .protocol("https")
  .host("kali.mapd.com")
  .port("10043")
  .dbName("mapd")
  .user("joe.ohallaron")
  .password("5cKqKXN49FtP")
    .connect((error, con) => {
      HeavyCrossfilter.crossfilter(con, config.table)
        .then((cf) => {
          createCharts(cf, HeavyCharting, config, con)
        })
      ;
    });
}

document.addEventListener('DOMContentLoaded', init, false);