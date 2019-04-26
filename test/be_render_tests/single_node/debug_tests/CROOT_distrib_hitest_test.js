const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const GetResultRowForPixelTest = require('../../lib/GetResultRowForPixelTest');

module.exports = function(test_collection, expect) {
  const debug_hittest_grp = new OmniSciServerTestGroup({
    test_description: `Debugging hit-test bug: https://jira.omnisci.com/browse/FE-5231`,
    golden_img_dir: `./golden_images`,
    timeout: 0,
    before: async (test_state) => {
      return test_state
        .pushState({
          server_config: {
            protocol: 'http',
            host: '10.1.0.12',
            port: 6278,
            dbName: 'mapd',
            user: 'mapd',
            password: 'HyperInteractive'
          }
        })
        .server_connection.connectAsync();
    },
    after: async (test_state) => {
      return test_state.popState().server_connection.disconnectAsync();
    }
  });
  test_collection.addTestGroup(debug_hittest_grp);

  var vega_1 = {
    width: 1199,
    height: 908,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT amount as key0, AVG(conv_4326_900913_x(lon)) as x, AVG(conv_4326_900913_y(lat)) as y, COUNT(*) as size FROM contributions WHERE ((contributions.lon >= -179.99998999999949 AND contributions.lon <= 179.99998999999963) AND (contributions.lat >= -71.76992084395594 AND contributions.lat <= 83.87735090331185)) GROUP BY key0'
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -20037507.226845037, 20037507.226845052 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ -11670809.257947173, 18677908.94410769 ],
        range: 'height'
      },
      {
        name: 'pointmap_size',
        type: 'linear',
        domain: [ 1, 5734327 ],
        range: [ 3, 10 ],
        clamp: true
      }
    ],
    projections: [],
    marks: [
      {
        type: 'symbol',
        from: {
          data: 'pointmap'
        },
        properties: {
          xc: {
            scale: 'x',
            field: 'x'
          },
          yc: {
            scale: 'y',
            field: 'y'
          },
          fillColor: 'blue',
          shape: 'circle',
          width: {
            scale: 'pointmap_size',
            field: 'size'
          },
          height: {
            scale: 'pointmap_size',
            field: 'size'
          }
        }
      }
    ]
  };

  var vega_2 = {
    width: 1199,
    height: 908,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT amount as key0, AVG(conv_4326_900913_x(lon)) as x, AVG(conv_4326_900913_y(lat)) as y, COUNT(*) as size FROM contributions WHERE ((contributions.lon >= -133.66944677374582 AND contributions.lon <= -113.07256482750488) AND (contributions.lat >= 34.57959491983971 AND contributions.lat <= 46.39114675201509)) GROUP BY key0'
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -14880014.74743036, -12587180.337560236 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ 4106895.5253004027, 5843253.860718692 ],
        range: 'height'
      },
      {
        name: 'pointmap_size',
        type: 'linear',
        domain: [ 1, 5734327 ],
        range: [ 3, 10 ],
        clamp: true
      }
    ],
    projections: [],
    marks: [
      {
        type: 'symbol',
        from: {
          data: 'pointmap'
        },
        properties: {
          xc: {
            scale: 'x',
            field: 'x'
          },
          yc: {
            scale: 'y',
            field: 'y'
          },
          fillColor: 'blue',
          shape: 'circle',
          width: {
            scale: 'pointmap_size',
            field: 'size'
          },
          height: {
            scale: 'pointmap_size',
            field: 'size'
          }
        }
      }
    ]
  };

  var vega_3 = {
    width: 1199,
    height: 908,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT amount as key0, AVG(conv_4326_900913_x(lon)) as x, AVG(conv_4326_900913_y(lat)) as y, COUNT(*) as size FROM contributions WHERE ((contributions.lon >= -133.66879196103343 AND contributions.lon <= -113.07369976027788) AND (contributions.lat >= 34.580160692094566 AND contributions.lat <= 46.39068587189911)) GROUP BY key0'
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -14879941.854012663, -12587306.677698595 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ 4106972.0208003144, 5843179.477095258 ],
        range: 'height'
      },
      {
        name: 'pointmap_size',
        type: 'linear',
        domain: [ 1, 5734327 ],
        range: [ 3, 10 ],
        clamp: true
      }
    ],
    projections: [],
    marks: [
      {
        type: 'symbol',
        from: {
          data: 'pointmap'
        },
        properties: {
          xc: {
            scale: 'x',
            field: 'x'
          },
          yc: {
            scale: 'y',
            field: 'y'
          },
          fillColor: 'blue',
          shape: 'circle',
          width: {
            scale: 'pointmap_size',
            field: 'size'
          },
          height: {
            scale: 'pointmap_size',
            field: 'size'
          }
        }
      }
    ]
  };

  debug_hittest_grp.addTest(`Should all work.`, [
    // new RenderVegaTest(vega_1, (result) => {}),
    // new RenderVegaTest(vega_2, (result) => {}),
    new RenderVegaTest(vega_3, (result) => {}),
    new GetResultRowForPixelTest(
      {
        pixel: { x: 744, y: 323 },
        table_col_names: {
          pointmap: [ 'key0', 'x', 'y', 'size' ]
        }
      },
      (result) => {
        expect(result).to.be.a.TPixelTableRowResult;
      }
    )
  ]);
};
