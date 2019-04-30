const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");
const ImageUtils = require("../../utils/ImageUtils");

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

  various_xform_test_grp.addTest(`Test a multilayer render using transforms for each layer`, [
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
  ]);

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

  various_xform_test_grp.addTest(`Test a second multilayer render using transforms for each layer`, [
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
  ]);

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

  various_xform_test_grp.addTest(`Tests another stddev transform generated from immerse`, [
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
  ]);

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

  // prettier-ignore
  const vega9 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "choroplethLayer0_fillColor",
        "type": "linear",
        "domain": [1, 6386.421462105914],
        "range": [
          "#115f9a",
          "#d0f400"
        ],
        "default": "green",
        "nullValue": "#CACACA",
        "clamp": false
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

  various_xform_test_grp.addTest(`Tests typical stddev transform from immerse works with polys`, [
    new RenderVegaTest(vega9, (result) => {
      expect(result).to.matchGoldenImage("various_xform_test_01.png");
      prev_result = result;
    }),
    new RenderVegaTest(
      // prettier-ignore
      ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "color", "xformtable", new_vega.scales[0].name);
          return new_vega;
        })(vega9),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega9.scales[0].name)
          .with.property("domain")
          .that.is.closeTo(vega9.scales[0].domain, 0.000000001);
      }
    )
  ]);

  // prettier-ignore
  const vega10 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": [83],
        "range": [
          "#115f9a",
          "#d0f400"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

  various_xform_test_grp.addTest(`Tests vega median transform with polys`, [
    new RenderVegaTest(vega10, (result) => {
      expect(result).to.matchGoldenImage("various_xform_test_02.png");
      prev_result = result;
    }),
    new RenderVegaTest(
      ((vega) => {
        const new_vega = JsonUtils.jsonCopy(vega);
        new_vega.data.push(
          // prettier-ignore
          {
            "name": "stats",
            "source": "choroplethLayer0",
            "transform": [
              {
                "type": "aggregate",
                "fields": ["color"],
                "ops":    ["median"],
                "as":     ["medianval"]
              }
            ]
          }
        );
        // prettier-ignore
        new_vega.scales[0].domain = {"data": "stats", "fields": ["medianval"]};
        return new_vega;
      })(vega10),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega10.scales[0].name)
          .with.property("domain")
          .that.deep.equals(vega10.scales[0].domain);
      }
    )
  ]);

  // prettier-ignore
  const vega11 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "choroplethLayer0",
        "format": "polys",
        "sql": "SELECT zipcodes_2017.rowid, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) AND ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY zipcodes_2017.rowid ORDER BY color"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-124.88749638788404, -64.60538826379779],
          "y": [20.1188223979657, 53.008194919853]
        }
      }
    ],
    "scales": [
      {
        "name": "choroplethLayer0_fillColor",
        "type": "threshold",
        "domain": [6, 17, 37, 83, 190, 462, 1266],
        "range": [
          "rgb(0,0,255)",
          "rgb(36,0,219)",
          "rgb(72,0,183)",
          "rgb(108,0,147)",
          "rgb(147,0,108)",
          "rgb(183,0,72)",
          "rgb(219,0,36)",
          "rgb(255,0,0)"
        ]
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "choroplethLayer0"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "choroplethLayer0_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

  various_xform_test_grp.addTest(`Tests vega quantile transform with polys`, [
    new RenderVegaTest(vega11, (result) => {
      expect(result).to.matchGoldenImage("various_xform_test_03.png");
      prev_result = result;
    }),
    new RenderVegaTest(
      ((vega) => {
        const new_vega = JsonUtils.jsonCopy(vega);
        new_vega.data.push(
          // prettier-ignore
          {
            "name": "stats",
            "source": "choroplethLayer0",
            "transform": [
              {
                "type": "aggregate",
                "fields": ["color"],
                "ops":    [{"type": "quantile", "numQuantiles": 8}],
                "as":     ["quantileval"]
              }
            ]
          }
        );
        // prettier-ignore
        new_vega.scales[0].domain = {"data": "stats", "fields": ["quantileval"]};
        return new_vega;
      })(vega11),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega11.scales[0].name)
          .with.property("domain")
          .that.deep.equals(vega11.scales[0].domain);
      }
    )
  ]);

  // prettier-ignore
  const vega12 = {
    "width": 1367,
    "height": 606,
    "data": [
      {
        "name": "heatmap_queryheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-6530917.742201228,-6282233.08404109,conv_4326_900913_y(lat),4374835.455183525,4485078.983234232,9.978102189781023,11.521719970543336,0,0,1367,606) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-6530917.742201228,-6282233.08404109,conv_4326_900913_y(lat),4374835.455183525,4485078.983234232,9.978102189781023,11.521719970543336,0,0,1367,606) as y, count(lang) as color FROM tweets_nov_feb_60M WHERE ((lon >= -58.71922901089208 AND lon <= -56.355921438536015) AND (lat >= 36.507063397754905 AND lat <= 37.34456933279846)) GROUP BY x, y"
      },
      {
        "name": "heatmap_queryheat_stats",
        "source": "heatmap_queryheat",
        "transform": [
          {
            "type": "aggregate",
            "fields": [ "color", "color", "color", "color" ],
            "ops": [ "min", "max", "avg", "stddev" ],
            "as": [ "minimum", "maximum", "mean", "deviation" ]
          },
          {
            "type": "formula",
            "expr": "max(minimum, mean-2*deviation)",
            "as": "mincolor"
          },
          {
            "type": "formula",
            "expr": "min(maximum, mean+2*deviation)",
            "as": "maxcolor"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -6530917.742201228, -6282233.08404109 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 4374835.455183525, 4485078.983234232 ],
        "range": "height"
      },
      {
        "name": "heat_colorsheat",
        "type": "quantize",
        "domain": {
          "data": "heatmap_queryheat_stats",
          "fields": [ "mincolor", "maxcolor" ]
        },
        "range": [
          "rgba(13,8,135,1)",
          "rgba(86,1,164,1)",
          "rgba(143,13,164,1)",
          "rgba(191,57,132,1)",
          "rgba(225,100,98,1)",
          "rgba(248,149,64,1)",
          "rgba(252,206,37,1)",
          "rgba(240,249,33,1)"
        ],
        "default": "rgba(13,8,135,1)",
        "nullValue": "rgba(13,8,135,1)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_queryheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.978102189781023,
          "height": 11.521719970543336,
          "fillColor": {
            "scale": "heat_colorsheat",
            "field": "color"
          }
        }
      }
    ]
  }
  various_xform_test_grp.addTest(
    `Tests that using the typical stddev vega transforms from immerse works with a query that returns empty results`,
    new RenderVegaTest(vega12, (result) => {
      expect(result).to.matchImage(ImageUtils.emptyPng(vega12.width, vega12.height));
      expect(result).to.have.vega_metadata.with
        .scale(vega12.scales[2].name)
        .with.property("domain")
        .that.deep.equals([ "NULL", "NULL" ]);
    })
  );

  // prettier-ignore
  const vega13 = {
    "width": 831,
    "height": 652,
    "data": [
      {
        "name": "backendScatter",
        "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_1.rowid FROM gaia_sim_2_1 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -15.666223625560967, 108.97143254398324 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -11.655807332925363, 112.98184883661884 ],
        "range": "height"
      },
      {
        "name": "backendScatter_fillColor",
        "type": "quantize",
        "domain": [60.31079265296532, 100],
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "points",
        "from": { "data": "backendScatter" },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
          "size": 4
        }
      }
    ]
  };

  // the gaia_sim_2_1 table has a column called health that is a smallint column and has a bunch of nulls
  // This tests proper aggregate data ignoring those nulls
  various_xform_test_grp.addTest(
    `Tests a scatterplot render using typical stddev immerse vega transforms using a smallint column with nulls`,
    [
      new RenderVegaTest(vega13, (result) => {
        prev_result = result;
      }),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "color", "xformtable", new_vega.scales[2].name);
          return new_vega;
        })(vega13),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega13.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega13.scales[2].domain, 0.000000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega14 = {
    "width": 831,
    "height": 652,
    "data": [
      {
        "name": "backendScatter",
        "sql": "SELECT x as x, y as y, health as color, gaia_sim_2_2.rowid FROM gaia_sim_2_2 WHERE ((x >= -15.666223625560967 AND x <= 108.97143254398324) AND (y >= -11.655807332925363 AND y <= 112.98184883661884))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -15.666223625560967, 108.97143254398324 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -11.655807332925363, 112.98184883661884 ],
        "range": "height"
      },
      {
        "name": "backendScatter_fillColor",
        "type": "quantize",
        "domain": [60.31079265296532, 100],
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "backendScatter"
        },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "backendScatter_fillColor", "field": "color" },
          "size": 4
        }
      }
    ]
  };

  // the gaia_sim_2_2 table has a column called health that is a float column and has a bunch of nulls
  // This tests proper aggregate data ignoring those nulls
  various_xform_test_grp.addTest(
    `Tests a scatterplot render using typical stddev immerse vega transforms using a float column with nulls`,
    [
      new RenderVegaTest(vega14, (result) => {
        prev_result = result;
      }),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "color", "xformtable", new_vega.scales[2].name);
          return new_vega;
        })(vega14),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega14.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega14.scales[2].domain, 0.000000000001);
        }
      )
    ]
  );

  // prettier-ignore
  const vega15 = {
    "width": 793,
    "height": 502,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT ST_X(dropoff_point) as x, ST_Y(dropoff_point) as y, cab_type_id as color, rowid FROM taxi_factual_closestbuilding WHERE MOD(rowid * 265445761, 4294967296) < 48373727 AND ((ST_X(dropoff_point) >= -74.23873554769207 AND ST_X(dropoff_point) <= -73.29965110742263) AND (ST_Y(dropoff_point) >= 40.55116668287144 AND ST_Y(dropoff_point) <= 41.00134102538428))"
      }
    ],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [-74.23873554769207, -73.29965110742263],
          "y": [40.55116668287144, 41.00134102538428]
        }
      }
    ],
    "scales": [
      {
        "name": "pointmap_fillColor",
        "type": "quantize",
        "domain": [1, 1],
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmap"
        },
        "properties": {
          "xc": { "field": "x" },
          "yc": { "field": "y" },
          "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
          "shape": "circle",
          "width": 1,
          "height": 1
        },
        "transform": {
          "projection": "mercator_map_projection"
        }
      }
    ]
  };

  // the taxi_factual_closestbuilding table has a column called cab_type_id that is tiny int column
  // ('cab_type_id INTEGER ENCODING FIXED(8)') and every row has a cab_type_id=1.
  // This tests aggregating tiny int columns
  various_xform_test_grp.addTest(
    `Tests that typical stddev immerse vega transforms works with tinyint (INTEGER ENCODING FIXED(8)) columns`,
    [
      new RenderVegaTest(vega15, (result) => {
        prev_result = result;
      }),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "color", "xformtable", new_vega.scales[0].name);
          return new_vega;
        })(vega15),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega15.scales[0].name)
            .with.property("domain")
            .that.deep.equals(vega15.scales[0].domain);
        }
      )
    ]
  );

  // prettier-ignore
  const vega16 = {
    "width": 716,
    "height": 352,
    "data": [
      {
        "name": "backendScatter",
        "sql": "SELECT dropoff_y as x, dropoff_x as y, extra as size, mta_tax as color, nyc_yellow_taxi_2014.rowid FROM nyc_yellow_taxi_2014 WHERE ((nyc_yellow_taxi_2014.dropoff_x >= -8227853.667385602 AND nyc_yellow_taxi_2014.dropoff_x <= -8226214.25584072) AND (nyc_yellow_taxi_2014.dropoff_y >= 4978689.731019676 AND nyc_yellow_taxi_2014.dropoff_y <= 4979529.601558646) AND (nyc_yellow_taxi_2014.dropoff_y >= -8227853.667385602 AND nyc_yellow_taxi_2014.dropoff_y <= -8226214.25584072) AND (nyc_yellow_taxi_2014.dropoff_x >= 4978689.731019676 AND nyc_yellow_taxi_2014.dropoff_x <= 4979529.601558646))"
      },
      {
        "name": "backendScatter_stats",
        "source": "backendScatter",
        "transform": [
          {
            "type": "aggregate",
            "fields": [
              "color",
              "color",
              "color",
              "color"
            ],
            "ops": [
              "min",
              "max",
              "avg",
              "stddev"
            ],
            "as": [
              "mincol",
              "maxcol",
              "avgcol",
              "stdcol"
            ]
          },
          {
            "type": "formula",
            "expr": "max(mincol, avgcol-2*stdcol)",
            "as": "mincolor"
          },
          {
            "type": "formula",
            "expr": "min(maxcol, avgcol+2*stdcol)",
            "as": "maxcolor"
          }
        ]
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -8227853.667385602,
          -8226214.25584072
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          4978689.731019676,
          4979529.601558646
        ],
        "range": "height"
      },
      {
        "name": "backendScatter_size",
        "type": "linear",
        "domain": [
          0,
          628.8699951171875
        ],
        "range": [
          3,
          10
        ],
        "clamp": true
      },
      {
        "name": "backendScatter_fillColor",
        "type": "quantize",
        "domain": {
          "data": "backendScatter_stats",
          "fields": [
            "mincolor",
            "maxcolor"
          ]
        },
        "range": [
          "rgba(17,95,154,0.85)",
          "rgba(25,132,197,0.85)",
          "rgba(34,167,240,0.85)",
          "rgba(72,181,196,0.85)",
          "rgba(118,198,143,0.85)",
          "rgba(166,215,91,0.85)",
          "rgba(201,229,47,0.85)",
          "rgba(208,238,17,0.85)",
          "rgba(208,244,0,0.85)"
        ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "backendScatter"
        },
        "properties": {
          "xc": {
            "scale": "x",
            "field": "x"
          },
          "yc": {
            "scale": "y",
            "field": "y"
          },
          "fillColor": {
            "scale": "backendScatter_fillColor",
            "field": "color"
          },
          "shape": "circle",
          "width": {
            "scale": "backendScatter_size",
            "field": "size"
          },
          "height": {
            "scale": "backendScatter_size",
            "field": "size"
          }
        }
      }
    ]
  }
  // Tests empty data, but buffers have data (from invalidkeys), should properly create an empty image without
  // error and with nulls in the scale domain metadata
  various_xform_test_grp.addTest(
    `Tests empty data. Should create an empty image and have nulls in the metadata scale domain.`,
    new RenderVegaTest(vega16, (result) => {
      expect(result).to.matchImage(ImageUtils.emptyPng(vega16.width, vega16.height));
      expect(result).to.have.vega_metadata.with
        .scale(vega16.scales[3].name)
        .with.property("domain")
        .that.deep.equals([ "NULL", "NULL" ]);
    })
  );

  // prettier-ignore
  const vega17 = {
    "width": 1359,
    "height": 895,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(Lon) as x, conv_4326_900913_y(Lat) as y, Speed as color, TrackAngle as size, rowid FROM airplanes_20161214 WHERE MOD(rowid * 265445761, 4294967296) < 292525826 AND ((Lon >= -124.38999999999945 AND Lon <= -66.9400000000007) AND (Lat >= 22.33928769805452 AND Lat <= 51.800212016720224))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -13847031.45787536, -7451726.712679397 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 2552309.8200721354, 6764081.524974389 ],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
        "type": "quantize",
        "domain": [0, 669.5757639796003],
        "range": [ "#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#d0f400" ]
      },
      {
        "name": "pointmap_size",
        "type": "quantize",
        "domain": [0, 359.9],
        "range": [ 1, 2, 4, 8, 14, 20 ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmap"
        },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
          "shape": "circle",
          "width": { "scale": "pointmap_size", "field": "size" },
          "height": { "scale": "pointmap_size", "field": "size" },
        }
      }
    ]
  };

  // Tests DECIMAL(12,3) column types with xforms using the airplanes_20161214 table. The Speed & TrackAngle columns are
  // DECIMAL(12,3)
  various_xform_test_grp.addTest(
    `Tests that typical stddev immerse vega transforms works with decimal (DECIMAL(12,3)) columns`,
    [
      new RenderVegaTest(vega17, (result) => {
        prev_result = result;
      }),
      new RenderVegaTest(
        // prettier-ignore
        ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "color", "xformtablecolor", new_vega.scales[2].name);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "size", "xformtablesize", new_vega.scales[3].name);
          return new_vega;
        })(vega17),
        (result) => {
          expect(result).to.matchImage(prev_result);
          expect(result).to.have.vega_metadata.with
            .scale(vega17.scales[2].name)
            .with.property("domain")
            .that.is.closeTo(vega17.scales[2].domain, 0.0000000001);
          expect(result).to.have.vega_metadata.with
            .scale(vega17.scales[3].name)
            .with.property("domain")
            .that.deep.equals(vega17.scales[3].domain);
        }
      )
    ]
  );

  // prettier-ignore
  const vega18 = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -367.239050286676, 336.23512241134455 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -159.0039062616728, 1157.8997450290199 ],
        "range": "height"
      },
      {
        "name": "points_fillColor",
        "type": "quantize",
        "domain": [-222.53715088908888, 222.21931468945832],
        "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "points"
        },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "width": 4,
          "height": 4,
          "fillColor": { "scale": "points_fillColor", "field": "x" }
        }
      }
    ]
  };

  // with the nba table, the original_x/y & converted_x/y columns are DECIMAL(14,7)
  various_xform_test_grp.addTest(`Tests that typical stddev immerse vega transforms works with DECIMAL(14,7) columns`, [
    new RenderVegaTest(vega18, (result) => {
      prev_result = result;
    }),
    new RenderVegaTest(
      // prettier-ignore
      ((vega) => {
          const new_vega = JsonUtils.jsonCopy(vega);
          add_stddev_xform_stats_to_vega(new_vega, new_vega.data[0].name, "x", "xformtable", new_vega.scales[2].name);
          return new_vega;
        })(vega18),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega18.scales[2].name)
          .with.property("domain")
          .that.is.closeTo(vega18.scales[2].domain, 0.0000000001);
      }
    )
  ]);

  // prettier-ignore
  const vega19 = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -367.239050286676, 336.23512241134455 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -159.0039062616728, 1157.8997450290199 ],
        "range": "height"
      },
      {
        "name": "points_fillColor",
        "type": "threshold",
        "domain": [ -114, -17, 0, 20, 110 ],
        "range": [ "rgb(17,95,154)", "rgb(34,167,240)", "rgb(118,198,143)", "rgb(201,229,47)", "rgb(208,238,17)", "rgb(208,244,0)" ]
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "points"
        },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "size": 4,
          "fillColor": { "scale": "points_fillColor", "field": "x" }
        }
      }
    ]
  };

  various_xform_test_grp.addTest(`Tests that a quantile vega xform works with DECIMAL(14,7) columns`, [
    new RenderVegaTest(vega19, (result) => {
      prev_result = result;
    }),
    new RenderVegaTest(
      ((vega) => {
        const new_vega = JsonUtils.jsonCopy(vega);
        new_vega.data.push(
          // prettier-ignore
          {
              "name": "points_stats",
              "source": "points",
              "transform": [
                {
                  "type": "aggregate",
                  "fields": ["x"],
                  "ops":    [{type: "quantile", numQuantiles: 6}],
                  "as":     ["quantx"]
                }
              ]
            }
        );
        // prettier-ignore
        new_vega.scales[2].domain = {"data": "points_stats", "fields": ["quantx"]}
        return new_vega;
      })(vega19),
      (result) => {
        expect(result).to.matchImage(prev_result);
        expect(result).to.have.vega_metadata.with
          .scale(vega19.scales[2].name)
          .with.property("domain")
          .that.deep.equals(vega19.scales[2].domain);
      }
    )
  ]);

  // prettier-ignore
  const vega20 = {
      "width":432,
      "height":256,
      "data":[
         {
            "name": "linemap",
            "format": "lines",
            "sql": "SELECT drawOrder as strokeColor, rowid, omnisci_geo FROM Ferry_Route WHERE ((ST_Intersects(ST_GeomFromText('POLYGON((-9.838404039411898 50.55533029518068, -2.310857889588476 50.55533029518068, -2.310857889588476 53.61604635210904, -9.838404039411898 53.61604635210904, -9.838404039411898 50.55533029518068))'), omnisci_geo)))"
         },
         {
            "name":"linemap_stats",
            "source":"linemap",
            "transform":[
               {
                  "type":"aggregate",
                  "fields":[ "strokeColor", "strokeColor" ],
                  "ops":[ "min", "max" ],
                  "as":[ "mincol", "maxcol" ]
               }
            ]
         }
      ],
      "scales":[
         {
            "name":"linemap_strokeColor",
            "type":"quantize",
            "domain":{
               "data":"linemap_stats",
               "fields":[ "mincol", "maxcol" ]
            },
            "range":[
               "rgba(17,95,154,0.85)",
               "rgba(25,132,197,0.85)",
               "rgba(34,167,240,0.85)",
               "rgba(72,181,196,0.85)",
               "rgba(118,198,143,0.85)",
               "rgba(166,215,91,0.85)",
               "rgba(201,229,47,0.85)",
               "rgba(208,238,17,0.85)",
               "rgba(208,244,0,0.85)"
            ],
            "nullValue": "orange"
         }
      ],
      "projections":[
         {
            "name":"mercator_map_projection",
            "type":"mercator",
            "bounds":{
               "x":[
                  -9.838404039411756,
                  -2.3108578895883056
               ],
               "y":[
                  50.72109682412818,
                  53.46071666206578
               ]
            }
         }
      ],
      "marks":[
         {
            "type":"lines",
            "from":{
               "data":"linemap"
            },
            "properties":{
               "x":{
                  "field":"x"
               },
               "y":{
                  "field":"y"
               },
               "strokeColor":{
                  "scale":"linemap_strokeColor",
                  "field":"strokeColor"
               },
               "strokeWidth":3,
               "lineJoin":"miter",
               "miterLimit":10
            },
            "transform":{
               "projection":"mercator_map_projection"
            }
         }
      ]
    };

  // the result of the above query results in a drawOrder column where every result row == NULL
  various_xform_test_grp.addTest(
    `Tests that a min/max xform works for a column that returns all NULLs`,
    new RenderVegaTest(vega20, (result) => {
      expect(result).to.matchGoldenImage("various_xform_test_04.png");
      expect(result).to.have.vega_metadata.with
        .scale(vega20.scales[0].name)
        .with.property("domain")
        .that.deep.equals([ "NULL", "NULL" ]);
    })
  );
};
