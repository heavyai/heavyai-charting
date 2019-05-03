const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const GetResultRowForPixelTest = require("../../lib/GetResultRowForPixelTest");

module.exports = function(test_collection, expect) {
  const debug_hittest_grp = new OmniSciServerTestGroup({
    test_description: `Debugging odd distrib image diff issue`,
    golden_img_dir: `./golden_images`,
    timeout: 0
  });
  test_collection.addTestGroup(debug_hittest_grp);

  // prettier-ignore
  const vega_1 = {
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
        "domain": [
          -14024766.300563749,
          -12458222.634801293
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          3602796.645339522,
          5159270.700761123
        ],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [
          0,
          0.125,
          0.25,
          0.375,
          0.5,
          0.625,
          0.75,
          0.875,
          1
        ],
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
        "minDensityCnt": "min",
        "maxDensityCnt": "max",
        "clamp": true
      },
      {
        "name": "size_by_num_flights",
        "type": "linear",
        "domain": [
          10000,
          100000
        ],
        "range": [
          20,
          80
        ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmap"
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
            "scale": "pointmap_fillColor",
            "value": 0
          },
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
  };

  const vega_2 = {
    width: 399,
    height: 535,
    data: [
      {
        name: "heatmap_query",
        sql:
          "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [ -12014254.628965287, -9693046.072701354 ],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [ 3280722.526925205, 6393119.964520493 ],
        range: "height"
      }
    ],
    marks: [
      {
        type: "symbol",
        from: {
          data: "heatmap_query"
        },
        properties: {
          shape: "circle",
          xc: {
            scale: "x",
            field: "x"
          },
          yc: {
            scale: "y",
            field: "y"
          },
          width: 5,
          height: 5,
          fillColor: "red"
        }
      }
    ]
  };

  debug_hittest_grp.addTest(`Test 1.`, [
    new RenderVegaTest(vega_1, (result) => {
      expect(result).to.matchGoldenImage("debug_test_01.png");
    })
  ]);

  debug_hittest_grp.addTest(
    `Test 2.`,
    new RenderVegaTest(vega_2, (result) => {
      expect(result).to.matchGoldenImage("debug_test_02.png");
    }),
    {
      pending: "Pending a fix for https://jira.omnisci.com/browse/BE-3509"
    }
    // {
    //   before: (test_state) => {
    //     return test_state
    //       .pushState({
    //         server_config: {
    //           protocol: "http",
    //           host: "10.1.0.12",
    //           port: 9090,
    //           dbName: "mapd",
    //           user: "mapd",
    //           password: "HyperInteractive"
    //         }
    //       })
    //       .server_connection.connectAsync();
    //   },
    //   after: (test_state) => {
    //     return test_state.popState().server_connection.disconnectAsync();
    //   }
    // }
  );
};
