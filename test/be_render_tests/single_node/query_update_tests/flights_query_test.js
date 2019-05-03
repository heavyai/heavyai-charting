const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");
const ImageUtils = require("../../utils/ImageUtils");

module.exports = function(test_collection, expect) {
  const update_data_test_grp = test_collection.createTestGroup({
    test_description: `Tests various vega renders against the flights dataset. These tests are meant to validate that different queries render appropriately using the flights dataset as the source.`,
    golden_img_dir: `./golden_images`
  });

  // prettier-ignore
  let vega = {
    "width": 800,
    "height": 563,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -19664143.90195494, 16210482.913587093 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -6461910.016250611, 18784858.60540035 ],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [ 0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1 ],
        "range": [
          "rgb(17,95,154)",
          "rgb(25,132,197)",
          "rgb(34,167,240)",
          "rgb(72,181,196)",
          "rgb(118,198,143)",
          "rgb(166,215,91)",
          "rgb(201,229,47)",
          "rgb(208,238,17)",
          "rgb(208,244,0)"
        ],
        "accumulator": "density",
        "minDensityCnt": "-2ndStdDev",
        "maxDensityCnt": "2ndStdDev",
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": { "data": "pointmap" },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "pointmap_fillColor", "value": 0 },
          "shape": "circle",
          "width": 8,
          "height": 8
        }
      }
    ]
  };

  const proj_test = new RenderVegaTest(vega, (result) =>
    expect(result).to.matchGoldenImage("flights_query_test_01.png")
  );
  const proj_test_name = update_data_test_grp.addTest(
    `Executes a density-accumulation render using legacy projection of an in-situ query. Sql: "${vega
      .data[0].sql}"`,
    proj_test
  );

  vega.data[0].sql =
    "SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) GROUP BY key0";
  update_data_test_grp.addTest(
    `Tests density-accumulation render with a data update from an in-situ query in test ${proj_test_name} to a non-in-situ query.  Sql: ${vega
      .data[0].sql}`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("flights_query_test_02.png")
    )
  );

  const prev_test_name = update_data_test_grp.addTest(
    `Tests density-accumulation render with a non-in-situ to in-situ query update. Should be exactly the same as ${proj_test_name}.`,
    proj_test
  );
  const prev_test = proj_test;

  update_data_test_grp.addTest(
    `Tests a full repeat of the previous test ${prev_test_name} and should be exactly the same.`,
    prev_test
  );

  // prettier-ignore
  vega = {
    "width": 1123,
    "height": 453,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, carrier_name as color, flights.rowid FROM flights WHERE (dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -17667203.915913504, -4293699.094562396 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 2910406.3625567225, 8305061.4686019095 ],
        "range": "height"
      },
      {
        name: "pointmap_fillColor",
        type: "ordinal",
        domain: [ "Southwest Airlines", "American Airlines", "US Airways", "Delta Air Lines", "United Air Lines" ],
        range: [ "rgb(234,85,69)", "rgb(189,207,50)", "rgb(179,61,198)", "rgb(239,155,32)", "rgb(135,188,69)" ],
        default: "rgb(39,174,239)",
        nullValue: "rgb(202,202,202)",
        accumulator: "blend"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": { "data": "pointmap" },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "fillColor": { "scale": "pointmap_fillColor", "field": "color" },
          "shape": "circle",
          "width": 10,
          "height": 10
        }
      }
    ]
  };

  // NOTE: uses the blend accumulation scale here to enforce determinism.
  // TODO(croot): look at other means of making this deterministic: i.e. using z-index
  // (once we get around to supporting z-index)
  update_data_test_grp.addTest(
    `Tests an ordinal scale colored by airline against using an in-situ projection query. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("flights_query_test_03.png")
    )
  );

  vega.data[0].sql =
    "SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y, APPROX_COUNT_DISTINCT(carrier_name) as color FROM flights WHERE ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) GROUP BY key0";
  vega.scales[2] = {
    name: "pointmap_fillColor",
    type: "quantize",
    domain: [ 1, 17 ],
    range: [
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
    clamp: true
  };

  update_data_test_grp.addTest(
    `Tests using a quantize scale to color points by an APPROX_COUNT_DISTINCT on a dict-encoded str column. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("flights_query_test_04.png")
    )
  );

  vega.data[0].sql =
    "SELECT AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y, carrier_name as color, COUNT(*) as cnt FROM flights WHERE ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) AND ((origin_lon >= -158.707193074989 AND origin_lon <= -38.57095522584763) AND (origin_lat >= 25.2818736395824 AND origin_lat <= 59.57201252897744)) GROUP BY carrier_name";
  vega.scales[2] = {
    name: "pointmap_fillColor",
    type: "ordinal",
    domain: [
      "Southwest Airlines",
      "American Airlines",
      "Skywest Airlines",
      "American Eagle Airlines",
      "US Airways",
      "Delta Air Lines",
      "United Air Lines",
      "Expressjet Airlines",
      "Northwest Airlines",
      "Continental Air Lines",
      "Other"
    ],
    range: [
      "rgb(234,85,69)",
      "rgb(189,207,50)",
      "rgb(179,61,198)",
      "rgb(239,155,32)",
      "rgb(135,188,69)",
      "rgb(244,106,155)",
      "rgb(172,229,199)",
      "rgb(237,225,91)",
      "rgb(131,109,197)",
      "rgb(134,216,127)",
      "rgb(39,174,239)"
    ],
    default: "rgb(39,174,239)",
    nullValue: "rgb(202,202,202)"
  };
  vega.scales.push({
    name: "pointmap_size",
    type: "threshold",
    domain: [ 10000, 250000, 500000 ],
    range: [ 8, 15, 25, 40 ]
  });
  vega.marks[0].properties.width = {
    scale: "pointmap_size",
    field: "cnt"
  };
  vega.marks[0].properties.height = vega.marks[0].properties.width;

  update_data_test_grp.addTest(
    `Tests using a ordinal scale to color points by a dict-encoded str column in a group-by query. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("flights_query_test_05.png")
    )
  );

  // airtime/arrdelay columns are ints, but the x/y axes scales use
  // doubles as the domain, so the ints are coersced at render time
  // to doubles
  update_data_test_grp.addTest(
    `Tests a scatter chart render that coerces ints to doubles for the axes measures.`,
    new RenderVegaTest(
      {
        width: 541,
        height: 457,
        data: [
          {
            name: "backendScatter",
            sql:
              "SELECT airtime as x, arrdelay as y, rowid FROM flights WHERE ((airtime >= 146.8018680288236 AND airtime <= 1219.1102225617133) AND (arrdelay >= -303.2348777943914 AND arrdelay <= 2063.7865270263574))"
          }
        ],
        scales: [
          {
            name: "x",
            type: "linear",
            domain: [ 146.8018680288236, 1219.1102225617133 ],
            range: "width"
          },
          {
            name: "y",
            type: "linear",
            domain: [ -303.2348777943914, 2063.7865270263574 ],
            range: "height"
          },
          {
            name: "backendScatter_fillColor",
            type: "linear",
            domain: [ 0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1 ],
            range: [
              "rgba(17,95,154,0.475)",
              "rgba(25,132,197,0.5471153846153846)",
              "rgba(34,167,240,0.6192307692307691)",
              "rgba(72,181,196,0.6913461538461538)",
              "rgba(118,198,143,0.7634615384615384)",
              "rgba(166,215,91,0.835576923076923)",
              "rgba(201,229,47,0.85)",
              "rgba(208,238,17,0.85)",
              "rgba(208,244,0,0.85)"
            ],
            accumulator: "density",
            minDensityCnt: "-2ndStdDev",
            maxDensityCnt: "2ndStdDev",
            clamp: true
          }
        ],
        marks: [
          {
            type: "points",
            from: { data: "backendScatter" },
            properties: {
              x: { scale: "x", field: "x" },
              y: { scale: "y", field: "y" },
              fillColor: { scale: "backendScatter_fillColor", value: 0 },
              size: 2
            }
          }
        ]
      },
      (result) => expect(result).to.matchGoldenImage("flights_query_test_06.png")
    )
  );

  // NOTE: using the following function to add an extra filter to the flights_query_test_8.
  // When we get around to supporting more determinism in the render (i.e. via a z-index), this can be removed
  function get_determinism_filter(carrier_name) {
    return `AND carrier_name like '${carrier_name}'`;
  }
  const same_layout_vega = {
    width: 1199,
    height: 918,
    data: [
      {
        name: "layer1",
        sql: `SELECT origin_lon as x, origin_lat as y, convert_meters_to_merc_pixel_width(100000, origin_lon, origin_lat, -176.64602661132824, -64.79855346679659, 1199, 0) as pxwidth, convert_meters_to_merc_pixel_height(100000, origin_lon, origin_lat, 17.552463237308004, 71.33568684811411, 918, 0) as pxheight, carrier_name as color, rowid FROM flights WHERE ((origin_lon >= -176.64602661132824 AND origin_lon <= -64.79855346679659) AND (origin_lat >= 17.552463237308004 AND origin_lat <= 71.33568684811411)) ${get_determinism_filter(
          "United Air Lines"
        )}`
      },
      {
        name: "layer2",
        sql: `SELECT dest_lon as x, dest_lat as y, convert_meters_to_merc_pixel_width(60000, dest_lon, dest_lat, -176.64602661132824, -64.79855346679659, 1199, 0) as pxwidth, convert_meters_to_merc_pixel_height(60000, dest_lon, dest_lat, 17.552463237308004, 71.33568684811411, 918, 0) as pxheight, carrier_name as color, rowid FROM flights WHERE ((dest_lon >= -176.64602661132824 AND dest_lon <= -64.79855346679659) AND (dest_lat >= 17.552463237308004 AND dest_lat <= 71.33568684811411)) ${get_determinism_filter(
          "Delta Air Lines"
        )}`
      }
    ],
    scales: [
      {
        name: "carrier_name_fill_color",
        type: "ordinal",
        domain: [
          "Southwest Airlines",
          "American Airlines",
          "Skywest Airlines",
          "American Eagle Airlines",
          "US Airways",
          "Delta Air Lines",
          "United Air Lines",
          "Expressjet Airlines",
          "Northwest Airlines",
          "Continental Air Lines"
        ],
        range: [
          "rgb(234,85,69)",
          "rgb(189,207,50)",
          "rgb(179,61,198)",
          "rgb(239,155,32)",
          "rgb(135,188,69)",
          "rgb(244,106,155)",
          "rgb(172,229,199)",
          "rgb(237,225,91)",
          "rgb(131,109,197)",
          "rgb(134,216,127)",
          "rgb(39,174,239)"
        ],
        default: "rgb(39,174,239)",
        nullValue: "rgb(202,202,202)"
      }
    ],
    projections: [
      {
        name: "merc",
        type: "mercator",
        bounds: {
          x: [ -176.64602661132824, -64.79855346679659 ],
          y: [ 17.552463237308004, 71.33568684811411 ]
        }
      }
    ],
    marks: [
      {
        type: "symbol",
        from: {
          data: "layer1"
        },
        properties: {
          xc: {
            field: "x"
          },
          yc: {
            field: "y"
          },
          fillColor: {
            scale: "carrier_name_fill_color",
            field: "color"
          },
          shape: "circle",
          width: {
            field: "pxwidth"
          },
          height: {
            field: "pxheight"
          }
        },
        transform: {
          projection: "merc"
        }
      },
      {
        type: "symbol",
        from: {
          data: "layer2"
        },
        properties: {
          xc: {
            field: "x"
          },
          yc: {
            field: "y"
          },
          fillColor: {
            scale: "carrier_name_fill_color",
            field: "color"
          },
          shape: "circle",
          width: {
            field: "pxwidth"
          },
          height: {
            field: "pxheight"
          }
        },
        transform: {
          projection: "merc"
        }
      }
    ]
  };

  const same_layout_test = new RenderVegaTest(same_layout_vega, (result) =>
    expect(result).to.matchGoldenImage("flights_query_test_07a.png")
  );

  same_layout_vega.data = [ same_layout_vega.data[1] ];
  same_layout_vega.marks = [ same_layout_vega.marks[1] ];
  const single_layer_test = new RenderVegaTest(same_layout_vega, (result) =>
    expect(result).to.matchGoldenImage("flights_query_test_07b.png")
  );

  update_data_test_grp.addTest(
    "Tests three consecutive renders. The first is a multi-layer render where the query associated with each layer has the same resulting layout. The second render retains the 2nd query but the 1st mark. The third is a repeat of the first to validate that the render works in reverse",
    [ same_layout_test, single_layer_test, same_layout_test ]
  );

  update_data_test_grp.addTest(
    "Tests two consecutive renders. The first is a group-by query, which will only render on a single gpu. The second is a projection query where the number of gpus is 2. The width/height scale is also removed from the first query. This should render appropriately and test that upping the # of gpus used in the render works.",
    [
      new RenderVegaTest(
        // prettier-ignore
        {
          "width": 1089,
          "height": 1082,
          "data": [
            {
              "name": "pointmap",
              "sql": "SELECT conv_4326_900913_x(AVG(dest_lon)) as x, conv_4326_900913_y(AVG(dest_lat)) as y, count(*) as num_flights, min(rowid) as rowid FROM flights WHERE dest_state like 'CA' GROUP BY dest_name"
            }
          ],
          "scales": [
            {
              "name": "x",
              "type": "linear",
              "domain": [-14024766.300563749,-12458222.634801293],
              "range": "width"
            },
            {
              "name": "y",
              "type": "linear",
              "domain": [3602796.645339522,5159270.700761123],
              "range": "height"
            },
            {
              "name": "size_by_num_flights",
              "type": "linear",
              "domain": [10000,100000],
              "range": [20,80],
              "clamp": true
            }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": {"data": "pointmap"},
              "properties": {
                "xc": {"scale": "x","field": "x"},
                "yc": {"scale": "y","field": "y"},
                "fillColor": "red",
                "shape": "circle",
                "width": {
                  "scale": "size_by_num_flights",
                  "field": "num_flights"
                },
                "height": {
                  "scale": "size_by_num_flights",
                  "field": "num_flights"
                }
              }
            }
          ]
        },
        (result) => {
          expect(result).to.matchGoldenImage("flights_query_test_08a.png");
        }
      ),
      new RenderVegaTest(
        // prettier-ignore
        {
          "width": 1074,
          "height": 1033,
          "data": [
            {
              "name": "pointmap",
              "sql": "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, rowid FROM flights WHERE dest_state like 'CA'"
            }
          ],
          "scales": [
            {
              "name": "x",
              "type": "linear",
              "domain": [ -14023882.296463663, -12457338.630701207 ],
              "range": "width"
            },
            {
              "name": "y",
              "type": "linear",
              "domain": [ 3599731.6180461347, 5156205.673467735 ],
              "range": "height"
            }
          ],
          "marks": [
            {
              "type": "symbol",
              "from": { "data": "pointmap" },
              "properties": {
                "xc": { "scale": "x", "field": "x" },
                "yc": { "scale": "y", "field": "y" },
                "fillColor": "red",
                "shape": "circle",
                "width": 10,
                "height": 10
              }
            }
          ]
        },
        (result) => {
          expect(result).to.matchGoldenImage("flights_query_test_08b.png");
        }
      )
    ]
  );
};
