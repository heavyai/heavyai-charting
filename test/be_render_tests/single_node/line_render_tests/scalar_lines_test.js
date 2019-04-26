const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const ImageUtils = require('../../utils/ImageUtils');

module.exports = function(test_collection, expect) {
  const line_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests various line renders that build the lines from scalar coordinate columns`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(line_test_grp);

  let vega = {
    width: 708,
    height: 881,
    data: [
      {
        name: 'pointmap',
        sql:
          "SELECT conv_4326_900913_x(origin_lon) as x1, conv_4326_900913_y(origin_lat) as y1, conv_4326_900913_x(dest_lon) as x2, conv_4326_900913_y(dest_lat) as y2, flights.rowid FROM flights WHERE (((origin_lon >= -124.38999999999976 AND origin_lon <= -66.94000000000037) AND (origin_lat >= 6.089823193983378 AND origin_lat <= 61.04948827377143)) OR ((dest_lon >= -124.38999999999976 AND dest_lon <= -66.94000000000037) AND (dest_lat >= 6.089823193983378 AND dest_lat <= 61.04948827377143))) AND carrier_name like 'United Air Lines'",
        format: {
          type: 'lines',
          coords: {
            x: [ 'x1', 'x2' ],
            y: [ 'y1', 'y2' ]
          },
          layout: 'interleaved'
        }
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -13847031.457875393, -7451726.712679361 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ 679196.0393832333, 8637195.305669934 ],
        range: 'height'
      }
    ],
    marks: [
      {
        type: 'lines',
        from: {
          data: 'pointmap'
        },
        properties: {
          x: {
            scale: 'x',
            field: 'x'
          },
          y: {
            scale: 'y',
            field: 'y'
          },
          strokeColor: 'red',
          strokeWidth: 2
        }
      }
    ]
  };

  const initial_line_test = new RenderVegaTest(vega, (result) =>
    expect(result).to.matchGoldenImage('scalar_lines_test_01.png')
  );
  let prev_test = line_test_grp.addTest(
    `Tests building out a line render using the origin and destination from the flights dataset.`,
    initial_line_test
  );

  line_test_grp.addTest(
    `Double checks that the exact same vega in successive render calls works. Should be the same as ${prev_test}`,
    initial_line_test
  );

  const empty_line_query = {
    width: 1183,
    height: 1059,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT conv_4326_900913_x(origin_lon) as x1, conv_4326_900913_y(origin_lat) as y1, conv_4326_900913_x(dest_lon) as x2, conv_4326_900913_y(dest_lat) as y2, flights.rowid FROM flights WHERE ((origin_lon >= -102.46276902850396 AND origin_lon <= -87.15069998423348) AND (origin_lat >= 12.373119922896137 AND origin_lat <= 25.311606413390578)) OR ((dest_lon >= -102.46276902850396 AND dest_lon <= -87.15069998423348) AND (dest_lat >= 12.373119922896137 AND dest_lat <= 25.311606413390578)) LIMIT 200',
        format: {
          type: 'lines',
          coords: { x: [ 'x1', 'x2' ], y: [ 'y1', 'y2' ] },
          layout: 'interleaved'
        }
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -11406103.271934122, -9701571.543171758 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ 1388201.5731146329, 2914067.254229401 ],
        range: 'height'
      }
    ],
    marks: [
      {
        type: 'lines',
        from: { data: 'pointmap' },
        properties: {
          x: { scale: 'x', field: 'x' },
          y: { scale: 'y', field: 'y' },
          strokeColor: 'red',
          strokeWidth: 2
        }
      }
    ]
  };

  line_test_grp.addTest(
    `Checks that a line render query that results in an empty result set runs without error`,
    new RenderVegaTest(empty_line_query, (result) =>
      expect(result).to.matchImage(
        ImageUtils.emptyPng(empty_line_query.width, empty_line_query.height)
      )
    )
  );
};
