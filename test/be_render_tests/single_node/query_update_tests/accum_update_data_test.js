const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const JsonUtils = require('../../utils/JsonUtils');
const ImageUtils = require('../../utils/ImageUtils');

module.exports = function(test_collection, expect) {
  const update_data_test_grp = new OmniSciServerTestGroup({
    test_description:
        `Tests vega updates to query data driving other various vega properties. These tests are meant to validate that any changes to the data between successive renders work appropriately.`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(update_data_test_grp);

  const vega = {
    width: 800,
    height: 563,
    data: [{
      name: 'pointmap',
      sql:
          'SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, flights.rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) LIMIT 2000000'
    }],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [-19664143.90195494, 16210482.913587093],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [-6461910.016250611, 18784858.60540035],
        range: 'height'
      },
      {
        name: 'pointmap_fillColor',
        type: 'linear',
        domain: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        range: [
          'rgb(17,95,154)', 'rgb(25,132,197)', 'rgb(34,167,240)',
          'rgb(72,181,196)', 'rgb(118,198,143)', 'rgb(166,215,91)',
          'rgb(201,229,47)', 'rgb(208,238,17)', 'rgb(208,244,0)'
        ],
        accumulator: 'density',
        minDensityCnt: '-2ndStdDev',
        maxDensityCnt: '2ndStdDev',
        clamp: true
      }
    ],
    marks: [{
      type: 'symbol',
      from: {data: 'pointmap'},
      properties: {
        xc: {scale: 'x', field: 'x'},
        yc: {scale: 'y', field: 'y'},
        fillColor: {scale: 'pointmap_fillColor', value: 0},
        shape: 'circle',
        width: 8,
        height: 8
      }
    }]
  }

  const proj_test = new RenderVegaTest(
      vega,
      (result) => expect(result).to.matchGoldenImage(
          'accum_update_data_test_01.png',
          {pixel_diff_threshold: 0.1, num_pixels_threshold: 5}));
  const proj_test_name = update_data_test_grp.addTest(
      `Executes a density-accumulation render using legacy projection of an in-situ query. Sql: "${
          vega.sql}"`,
      proj_test);

  vega.sql =
      'SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) GROUP BY key0';
  update_data_test_grp.addTest(
      `Tests density-accumulation render with a data update from an in-situ query in test ${
          proj_test_name} to a non-in-situ query.  Sql: ${vega.sql}`,
      new RenderVegaTest(
          vega,
          (result) => expect(result).to.matchGoldenImage(
              'accum_update_data_test_02.png',
              {pixel_diff_threshold: 0.1, num_pixels_threshold: 5})));

  update_data_test_grp.addTest(
      `Tests density-accumulation render with a non-in-situ to in-situ query update. Should be exactly the same as ${
          proj_test_name}.`,
      proj_test);
};