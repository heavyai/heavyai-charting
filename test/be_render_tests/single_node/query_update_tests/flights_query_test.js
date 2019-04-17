const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const JsonUtils = require('../../utils/JsonUtils');
const ImageUtils = require('../../utils/ImageUtils');

module.exports = function(test_collection, expect) {
  const update_data_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests various vega renders against the flights dataset. These tests are meant to validate that different queries render appropriately using the flights dataset as the source.`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(update_data_test_grp);

  let vega = {
    width: 800,
    height: 563,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, flights.rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) LIMIT 2000000'
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -19664143.90195494, 16210482.913587093 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ -6461910.016250611, 18784858.60540035 ],
        range: 'height'
      },
      {
        name: 'pointmap_fillColor',
        type: 'linear',
        domain: [ 0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1 ],
        range: [
          'rgb(17,95,154)',
          'rgb(25,132,197)',
          'rgb(34,167,240)',
          'rgb(72,181,196)',
          'rgb(118,198,143)',
          'rgb(166,215,91)',
          'rgb(201,229,47)',
          'rgb(208,238,17)',
          'rgb(208,244,0)'
        ],
        accumulator: 'density',
        minDensityCnt: '-2ndStdDev',
        maxDensityCnt: '2ndStdDev',
        clamp: true
      }
    ],
    marks: [
      {
        type: 'symbol',
        from: { data: 'pointmap' },
        properties: {
          xc: { scale: 'x', field: 'x' },
          yc: { scale: 'y', field: 'y' },
          fillColor: { scale: 'pointmap_fillColor', value: 0 },
          shape: 'circle',
          width: 8,
          height: 8
        }
      }
    ]
  };

  const proj_test = new RenderVegaTest(vega, (result) =>
    expect(result).to.matchGoldenImage('flights_query_test_01.png', {
      pixel_diff_threshold: 0.1,
      num_pixels_threshold: 5
    })
  );
  const proj_test_name = update_data_test_grp.addTest(
    `Executes a density-accumulation render using legacy projection of an in-situ query. Sql: "${vega.sql}"`,
    proj_test
  );

  vega.data[0].sql =
    'SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) GROUP BY key0';
  update_data_test_grp.addTest(
    `Tests density-accumulation render with a data update from an in-situ query in test ${proj_test_name} to a non-in-situ query.  Sql: ${vega.sql}`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('flights_query_test_02.png', {
        pixel_diff_threshold: 0.1,
        num_pixels_threshold: 5
      })
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

  vega = {
    width: 1123,
    height: 453,
    data: [
      {
        name: 'pointmap',
        sql:
          'SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, carrier_name as color, flights.rowid FROM flights WHERE (dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744) AND rowid < 200000'
      }
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [ -17667203.915913504, -4293699.094562396 ],
        range: 'width'
      },
      {
        name: 'y',
        type: 'linear',
        domain: [ 2910406.3625567225, 8305061.4686019095 ],
        range: 'height'
      },
      {
        name: 'pointmap_fillColor',
        type: 'ordinal',
        domain: [
          'Southwest Airlines',
          'American Airlines',
          'Skywest Airlines',
          'American Eagle Airlines',
          'US Airways',
          'Delta Air Lines',
          'United Air Lines',
          'Expressjet Airlines',
          'Northwest Airlines',
          'Continental Air Lines',
          'Other'
        ],
        range: [
          'rgb(234,85,69)',
          'rgb(189,207,50)',
          'rgb(179,61,198)',
          'rgb(239,155,32)',
          'rgb(135,188,69)',
          'rgb(244,106,155)',
          'rgb(172,229,199)',
          'rgb(237,225,91)',
          'rgb(131,109,197)',
          'rgb(134,216,127)',
          'rgb(39,174,239)'
        ],
        default: 'rgb(39,174,239)',
        nullValue: 'rgb(202,202,202)'
      }
    ],
    marks: [
      {
        type: 'symbol',
        from: { data: 'pointmap' },
        properties: {
          xc: { scale: 'x', field: 'x' },
          yc: { scale: 'y', field: 'y' },
          fillColor: { scale: 'pointmap_fillColor', field: 'color' },
          shape: 'circle',
          width: 10,
          height: 10
        }
      }
    ]
  };

  update_data_test_grp.addTest(
    `Tests an ordinal scale colored by airline against using an in-situ projection query. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('flights_query_test_03.png')
    )
  );

  vega.data[0].sql =
    'SELECT dest as key0, AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y, APPROX_COUNT_DISTINCT(carrier_name) as color FROM flights WHERE ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) GROUP BY key0';
  vega.scales[2] = {
    name: 'pointmap_fillColor',
    type: 'quantize',
    domain: [ 1, 17 ],
    range: [
      '#115f9a',
      '#1984c5',
      '#22a7f0',
      '#48b5c4',
      '#76c68f',
      '#a6d75b',
      '#c9e52f',
      '#d0ee11',
      '#d0f400'
    ],
    clamp: true
  };

  update_data_test_grp.addTest(
    `Tests using a quantize scale to color points by an APPROX_COUNT_DISTINCT on a dict-encoded str column. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('flights_query_test_04.png')
    )
  );

  vega.data[0].sql =
    'SELECT AVG(conv_4326_900913_x(dest_lon)) as x, AVG(conv_4326_900913_y(dest_lat)) as y, carrier_name as color, COUNT(*) as cnt FROM flights WHERE ((dest_lon >= -158.707193074989 AND dest_lon <= -38.57095522584763) AND (dest_lat >= 25.2818736395824 AND dest_lat <= 59.57201252897744)) AND ((origin_lon >= -158.707193074989 AND origin_lon <= -38.57095522584763) AND (origin_lat >= 25.2818736395824 AND origin_lat <= 59.57201252897744)) GROUP BY carrier_name';
  vega.scales[2] = {
    name: 'pointmap_fillColor',
    type: 'ordinal',
    domain: [
      'Southwest Airlines',
      'American Airlines',
      'Skywest Airlines',
      'American Eagle Airlines',
      'US Airways',
      'Delta Air Lines',
      'United Air Lines',
      'Expressjet Airlines',
      'Northwest Airlines',
      'Continental Air Lines',
      'Other'
    ],
    range: [
      'rgb(234,85,69)',
      'rgb(189,207,50)',
      'rgb(179,61,198)',
      'rgb(239,155,32)',
      'rgb(135,188,69)',
      'rgb(244,106,155)',
      'rgb(172,229,199)',
      'rgb(237,225,91)',
      'rgb(131,109,197)',
      'rgb(134,216,127)',
      'rgb(39,174,239)'
    ],
    default: 'rgb(39,174,239)',
    nullValue: 'rgb(202,202,202)'
  };
  vega.scales.push({
    name: 'pointmap_size',
    type: 'threshold',
    domain: [ 10000, 250000, 500000 ],
    range: [ 8, 15, 25, 40 ]
  });
  vega.marks[0].properties.width = {
    scale: 'pointmap_size',
    field: 'cnt'
  };
  vega.marks[0].properties.height = vega.marks[0].properties.width;

  update_data_test_grp.addTest(
    `Tests using a ordinal scale to color points by a dict-encoded str column in a group-by query. Query: ${vega
      .data[0].sql}.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('flights_query_test_04.png')
    )
  );
};
