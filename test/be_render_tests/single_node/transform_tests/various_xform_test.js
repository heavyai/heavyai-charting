const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");

module.exports = function(test_collection, expect) {
  const various_xform_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests pct accumulation renders`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(various_xform_test_grp);

  function get_scale_by_name(vega, scale) {
    for (const vega_scale of vega.scales) {
      if (vega_scale.name === scale) {
        return vega_scale;
      }
    }
    return null;
  }

  // prettier-ignore
  function add_stddev_xform_stats_to_vega(vega, vega_table, col_name, stats_table_name, scales) {
    vega.data.push({
      "name": stats_table_name,
      "source": vega_table,
      "transform": [
        {
          "type": "aggregate",
          "fields": [ col_name, col_name, col_name, col_name ],
          "ops": [ "min", "max", "avg", "stddev" ],
          "as": [ "mincol", "maxcol", "avgcol", "stdcol" ]
        },
        {
          "type": "formula",
          "expr": "max(mincol, avgcol-2*stdcol)",
          "as": "mincoltouse"
        },
        {
          "type": "formula",
          "expr": "min(maxcol, avgcol+2*stdcol)",
          "as": "maxcoltouse"
        }
      ]
    });

    if (scales instanceof String || typeof scales === 'string') {
      scales = [scales];
    }

    scales.forEach(scale => {
      const scale_vega = get_scale_by_name(vega, scale);
      if (scale_vega) {
        scale_vega.domain = {
          "data": stats_table_name,
          "fields": [ "mincoltouse", "maxcoltouse" ]
        };
      }
    })
  }

  // prettier-ignore
  const vega1 = {
    "width": 924,
    "height": 1050,
    "data": [
      {
        "name": "table",
        "sql": "SELECT lon as x, lat as y, followers, rowid FROM tweets_nov_feb_60M WHERE (lon >= -124.69676569314493 AND lon < -113.63757014395915) AND (lat >= 32.36434186899989 AND lat < 42.32782734437228) AND followers >= 0"
      }
    ],
    "scales": [
      {
        "name": "size",
        "type": "linear",
        "domain": [0,62205.654309155994],
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [0,62205.654309155994],
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.69676569314493,-113.63757014395915],
          "y": [32.36434186899989,42.32782734437228]
        }
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {"data": "table"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "fillColor": {"scale": "color","field": "followers"},
          "size": {"scale": "size","field": "followers"}
        },
        "transform": {"projection": "merc"}
      }
    ]
  }

  let prev_result = null;
  various_xform_test_grp.addTest(
    `Tests that the typical stddev transform generated from immerse matches raw calculated data with a simple projection query`,
    [
      new RenderVegaTest(vega1, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "table", "followers", "xformtable", ["size", "color"]);
          return new_vega;
        })(vega1),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega1.scales[0].name)
            .with.property("domain")
            .that.is.closeTo(vega1.scales[0].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega1.scales[1].name)
            .with.property("domain")
            .that.is.closeTo(vega1.scales[1].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega2 = {
    "width": 897,
    "height": 647,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-17552387.676773123,17552387.676773123,conv_4326_900913_y(lat),-9156868.024211522,16163967.710328406,9.966666666666667,11.508515365846542,0,0,897,647) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -157.6757812499982 AND lon <= 157.67578124999824) AND (lat >= -63.229988334753756 AND lat <= 80.92969955993243)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -17552387.676773123, 17552387.676773123 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -9156868.024211522, 16163967.710328406 ],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [ 1, 180758.13110590022 ],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }
  various_xform_test_grp.addTest(
    `Tests that the typical stddev transform generated from immerse matches raw calculated data with a heatmap query`,
    [
      new RenderVegaTest(vega2, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "heatmap_query", "color", "xformtable", ["heat_color"]);
          return new_vega;
        })(vega2),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega2.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega2.scales[2].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega3 = {
    "width": 1089,
    "height": 1033,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-1332948.164675159,1185341.9875424104,conv_4326_900913_y(lat),4144949.750773329,6533741.052186728,9.966666666666667,11.508515365846542,0,0,1089,1033) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-1332948.164675159,1185341.9875424104,conv_4326_900913_y(lat),4144949.750773329,6533741.052186728,9.966666666666667,11.508515365846542,0,0,1089,1033) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -11.974077094334405 AND lon <= 10.648108244661813) AND (lat >= 34.86057354541522 AND lat <= 50.50239687288396)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -11.974077094334405 AND lon <= 10.648108244661813) AND (lat >= 34.86057354541522 AND lat <= 50.50239687288396))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [-1332948.164675159,1185341.9875424104],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [4144949.750773329,6533741.052186728],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [1, 8414.175747978927],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": [-1, 48189.00022641456],
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": [-1, 48189.00022641456], 
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "heatmap_query"},
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {"field": "x"},
          "yc": {"field": "y"},
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {"scale": "heat_color","field": "color"}
        }
      },
      {
        "type": "points",
        "from": {"data": "pointmap_query"},
        "properties": {
          "x": {"scale": "x","field": "x"},
          "y": {"scale": "y","field": "y"},
          "fillColor": {"scale": "point_color","field": "followers"},
          "size": {"scale": "point_size","field": "followers"}
        }
      }
    ]
  }

  various_xform_test_grp.addTest(
    `Test a multilayer render using transforms for each layer`,
    [
      new RenderVegaTest(vega3, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "heatmap_query", "color", "heatstats", ["heat_color"]);
          add_stddev_xform_stats_to_vega(new_vega, "pointmap_query", "followers", "pointstats", ["point_size", "point_color"]);
          return new_vega;
        })(vega3),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega3.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega3.scales[2].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega3.scales[3].name)
            .with.property("domain")
            .that.is.closeTo(vega3.scales[3].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega3.scales[4].name)
            .with.property("domain")
            .that.is.closeTo(vega3.scales[4].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega4 = {
    "width": 1089,
    "height": 1033,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-1332948.164675159,1185341.9875424104,conv_4326_900913_y(lat),4144949.750773329,6533741.052186728,9.966666666666667,11.508515365846542,0,0,1089,1033) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-1332948.164675159,1185341.9875424104,conv_4326_900913_y(lat),4144949.750773329,6533741.052186728,9.966666666666667,11.508515365846542,0,0,1089,1033) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -11.974077094334405 AND lon <= 10.648108244661813) AND (lat >= 34.86057354541522 AND lat <= 50.50239687288396)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -11.974077094334405 AND lon <= 10.648108244661813) AND (lat >= 34.86057354541522 AND lat <= 50.50239687288396))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [-1332948.164675159,1185341.9875424104],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [4144949.750773329,6533741.052186728],
        "range": "height"
      },
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [1, 8414.175747978927],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": [-1, 48189.00022641456], 
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "point_color",
        "type": "linear",
        "domain": [-1, 48189.00022641456], 
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "heatmap_query"},
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {"field": "x"},
          "yc": {"field": "y"},
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {"scale": "heat_color","field": "color"}
        }
      },
      {
        "type": "points",
        "from": {"data": "pointmap_query"},
        "properties": {
          "x": {"scale": "x","field": "x"},
          "y": {"scale": "y","field": "y"},
          "fillColor": {"scale": "point_color","field": "followers"},
          "size": {"scale": "point_size","field": "followers"}
        }
      }
    ]
  }

  various_xform_test_grp.addTest(
    `Test a second multilayer render using transforms for each layer`,
    [
      new RenderVegaTest(vega4, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "heatmap_query", "color", "heatstats", ["heat_color"]);
          add_stddev_xform_stats_to_vega(new_vega, "pointmap_query", "followers", "pointstats", ["point_size", "point_color"]);
          return new_vega;
        })(vega4),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega4.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega4.scales[2].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega4.scales[3].name)
            .with.property("domain")
            .that.is.closeTo(vega4.scales[3].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega4.scales[4].name)
            .with.property("domain")
            .that.is.closeTo(vega4.scales[4].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega5 = {
    "width": 1282,
    "height": 1082,
    "data": [
      {
        "name": "table",
        "sql": "SELECT lon as x, lat as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= -64.24920120942178 AND lon <= -21.272756245864713) AND (lat >= -34.28802128423848 AND lat <= -0.26750026970050556))"
      }
    ],
    "scales": [
      {
        "name": "size",
        "type": "linear",
        "domain": [-1, 31091.84773868343],
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "color",
        "type": "linear",
        "domain": [-1, 31091.84773868343], 
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-64.24920120942178,-21.272756245864713],
          "y": [-34.28802128423848,-0.26750026970050556]
        }
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {"data": "table"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "fillColor": {"scale": "color","field": "followers"},
          "size": {"scale": "size","field": "followers"}
        },
        "transform": {"projection": "merc"}
      }
    ]
  }

  various_xform_test_grp.addTest(
    `Tests another stddev transform generated from immerse`,
    [
      new RenderVegaTest(vega5, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "table", "followers", "xformtable", ["size", "color"]);
          return new_vega;
        })(vega5),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega5.scales[0].name)
            .with.property("domain")
            .that.is.closeTo(vega5.scales[0].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega5.scales[1].name)
            .with.property("domain")
            .that.is.closeTo(vega5.scales[1].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega6 = {
    "width": 1282,
    "height": 1082,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),7042896.2821744755,14269350.313012654,conv_4326_900913_y(lat),-636894.5458111882,5462187.561337168,9.966666666666667,11.508515365846542,0,0,1282,1082) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),7042896.2821744755,14269350.313012654,conv_4326_900913_y(lat),-636894.5458111882,5462187.561337168,9.966666666666667,11.508515365846542,0,0,1282,1082) as y, AVG(followers) as color FROM tweets_nov_feb_60M WHERE ((lon >= 63.26741375626574 AND lon <= 128.18375482419276) AND (lat >= -5.711836611266094 AND lat <= 43.97896510757883)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= 63.26741375626574 AND lon <= 128.18375482419276) AND (lat >= -5.711836611266094 AND lat <= 43.97896510757883))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [7042896.2821744755,14269350.313012654],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [-636894.5458111882,5462187.561337168],
        "range": "height"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": [-1, 32629.04152091595], 
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": [-1, 32629.04152091595],
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "heatmap_query"},
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {"field": "x"},
          "yc": {"field": "y"},
          "width": 9.966666666666667,
          "height": 11.508515365846542,
          "fillColor": {"scale": "all_color","field": "color"}
        }
      },
      {
        "type": "points",
        "from": {"data": "pointmap_query"},
        "properties": {
          "x": {"scale": "x","field": "x"},
          "y": {"scale": "y","field": "y"},
          "fillColor": {"scale": "all_color","field": "followers"},
          "size": {"scale": "point_size","field": "followers"}
        }
      }
    ]
  }

  various_xform_test_grp.addTest(
    `Test another multilayer render using transforms for each layer where each layer uses a color scale that uses stats from one of the layers`,
    [
      new RenderVegaTest(vega6, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "pointmap_query", "followers", "pointstats", ["point_size", "all_color"]);
          return new_vega;
        })(vega6),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega6.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega6.scales[2].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega6.scales[3].name)
            .with.property("domain")
            .that.is.closeTo(vega6.scales[3].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega7 = {
    "width": 1282,
    "height": 1082,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),7042896.2821744755,14269350.313012654,conv_4326_900913_y(lat),-636894.5458111882,5462187.561337168,9.966666666666667,11.508515365846542,0,0,1282,1082) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),7042896.2821744755,14269350.313012654,conv_4326_900913_y(lat),-636894.5458111882,5462187.561337168,9.966666666666667,11.508515365846542,0,0,1282,1082) as y, AVG(followers) as color FROM tweets_nov_feb_60M WHERE ((lon >= 63.26741375626574 AND lon <= 128.18375482419276) AND (lat >= -5.711836611266094 AND lat <= 43.97896510757883)) GROUP BY x, y"
      },
      {
        "name": "pointmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x,conv_4326_900913_y(lat) as y,followers,rowid FROM tweets_nov_feb_60M WHERE ((lon >= 63.26741375626574 AND lon <= 128.18375482419276) AND (lat >= -5.711836611266094 AND lat <= 43.97896510757883))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [7042896.2821744755,14269350.313012654],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [-636894.5458111882,5462187.561337168],
        "range": "height"
      },
      {
        "name": "point_size",
        "type": "linear",
        "domain": [0,25993.8282470035],
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "all_color",
        "type": "linear",
        "domain": [0,25993.8282470035],
        "range": ["rgb(0,0,255)","rgb(255,0,0)"],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {"data": "pointmap_query"},
        "properties": {
          "x": {"scale": "x","field": "x"},
          "y": {"scale": "y","field": "y"},
          "fillColor": {"scale": "all_color","field": "followers"},
          "size": {"scale": "point_size","field": "followers"}
        }
      }
    ]
  }

  various_xform_test_grp.addTest(
    `Test render with 1 mark layer and two data sources where the mark layer has a color/size driven by the data that isn't rendered`,
    [
      new RenderVegaTest(vega7, (result) => (prev_result = result)),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, "heatmap_query", "color", "heatmap_stats", ["point_size", "all_color"]);
          return new_vega;
        })(vega7),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega7.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega7.scales[2].domain, 0.000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega7.scales[3].name)
            .with.property("domain")
            .that.is.closeTo(vega7.scales[3].domain, 0.000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega8 = {
    "width": 880,
    "height": 1002,
    "data": [
      {
        "name": "table",
        "sql": "SELECT lon as x,lat as y,followers,lang,rowid FROM tweets_nov_feb_60M WHERE (lon >= -10.344418524042084 AND lon < 19.00401167390217) AND (lat >= 35.43587203805707 AND lat < 57.88528435214329)"
      }
    ],
    "scales": [
      {
        "name": "size",
        "type": "linear",
        "domain": [-1, 41612.9467400753],
        "range": [1,20],
        "clamp": true
      },
      {
        "name": "color",
        "type": "ordinal",
        "domain": ["pt", "en", "und", "ru", "es", "ar", "in", "sl", "tl", "et", "fr", "ht", "th", "cy", "ja", "tr", "ko", "no", "uk", "vi", "bs", "it", "sv", "sk", "hr", "de", "lv", "ro", "nl", "fi", "lt", "zh", "iw", "hu", "pl", "el", "is", "bg", "da", "hi", "fa", "ta", "ur", "ne", "kn", "sr", "si", "lo", "bn", "hy", "ka", "pa", "te", "iu", "sd", "gu", "ps", "chr", "ckb", "bo"],
        "range": [
          "blue",
          "red",
          "green",
          "yellow",
          "magenta",
          "purple",
          "teal"
        ]
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-10.344418524042084,19.00401167390217],
          "y": [35.43587203805707,57.88528435214329]
        }
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {"data": "table"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "fillColor": {"scale": "color","field": "lang"},
          "size": {"scale": "size","field": "followers"}
        },
        "transform": {"projection": "merc"}
      }
    ]
  }

  various_xform_test_grp.addTest(`Test a distinct vega transform`, [
    new RenderVegaTest(vega8, (result) => (prev_result = result)),
    new RenderVegaTest(
      // prettier-ignore
      ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          new_vega.data.push(
            {
              "name": "xformtable",
              "source": "table",
              "transform": [
                {
                  "type": "aggregate",
                  "fields": [ "followers", "followers", "followers", "followers", "lang" ],
                  "ops": [ "min", "max", "avg", "stddev", "distinct" ],
                  "as": [ "minfol", "maxfol", "avgfol", "stdfol", "distinctlang" ]
                },
                {
                  "type": "formula",
                  "expr": "max(minfol, avgfol-2*stdfol)",
                  "as": "minfoltouse"
                },
                {
                  "type": "formula",
                  "expr": "min(maxfol, avgfol+2*stdfol)",
                  "as": "maxfoltouse"
                }
              ]
            }
          )
          new_vega.scales[0].domain = {"data": "xformtable", "fields": ["minfoltouse", "maxfoltouse"]};
          new_vega.scales[1].domain = {"data": "xformtable", "field": "distinctlang"};
          return new_vega;
        })(vega8),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega8.scales[0].name)
          .with.property("domain")
          .that.is.closeTo(vega8.scales[0].domain, 0.000000001);
        expect(result).to.have.vega_metadata.with
          .scale(vega8.scales[1].name)
          .with.property("domain")
          .that.deep.equals(vega8.scales[1].domain);
      }
    )
  ]);
};
