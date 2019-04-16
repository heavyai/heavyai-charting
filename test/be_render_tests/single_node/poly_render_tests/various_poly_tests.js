const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const SqlExecuteTest = require('../../lib/SqlExecuteTest');
const ImageUtils = require('../../utils/ImageUtils');

module.exports = function(test_collection, expect) {
  let vega = {
    width: 729,
    height: 767,
    data: [
      {
        name: 'backendChoropleth',
        format: 'polys',
        geocolumn: 'mapd_geo',
        sql:
          'SELECT mapd_countries.rowid, tweets_2017_may.country as key0, avg(followees) as color FROM tweets_2017_may, mapd_countries WHERE (tweets_2017_may.country = mapd_countries.name) GROUP BY mapd_countries.rowid, key0'
      },
      {
        name: 'backendChoropleth_stats',
        source: 'backendChoropleth',
        transform: [
          {
            type: 'aggregate',
            fields: [ 'color', 'color', 'color', 'color' ],
            ops: [ 'min', 'max', 'avg', 'stddev' ],
            as: [ 'mincol', 'maxcol', 'avgcol', 'stdcol' ]
          },
          {
            type: 'formula',
            expr: 'max(mincol, avgcol-2*stdcol)',
            as: 'mincolor'
          },
          {
            type: 'formula',
            expr: 'min(maxcol, avgcol+2*stdcol)',
            as: 'maxcolor'
          }
        ]
      }
    ],
    scales: [
      {
        name: 'backendChoropleth_fillColor',
        type: 'quantize',
        domain: {
          data: 'backendChoropleth_stats',
          fields: [ 'mincolor', 'maxcolor' ]
        },
        range: [
          'rgba(17,95,154,0.85)',
          'rgba(25,132,197,0.85)',
          'rgba(34,167,240,0.85)',
          'rgba(72,181,196,0.85)',
          'rgba(118,198,143,0.85)',
          'rgba(166,215,91,0.85)',
          'rgba(201,229,47,0.85)',
          'rgba(208,238,17,0.85)',
          'rgba(208,244,0,0.85)'
        ],
        nullValue: 'rgba(214, 215, 214, 0.65)',
        default: 'rgba(214, 215, 214, 0.65)'
      }
    ],
    projections: [
      {
        name: 'mercator_map_projection',
        type: 'mercator',
        bounds: {
          x: [ -167.15871080427152, 173.88469374214333 ],
          y: [ -85.00000000000024, 85.00000000000028 ]
        }
      }
    ],
    marks: [
      {
        type: 'polys',
        from: {
          data: 'backendChoropleth'
        },
        properties: {
          x: {
            field: 'x'
          },
          y: {
            field: 'y'
          },
          fillColor: {
            scale: 'backendChoropleth_fillColor',
            field: 'color'
          },
          strokeWidth: 0
        },
        transform: {
          projection: 'mercator_map_projection'
        }
      }
    ]
  };

  const test_grp = new OmniSciServerTestGroup({
    test_description: `Tests a handful of various poly renders testing different specializations`,
    golden_img_dir: `./golden_images`
  });

  test_grp.addTest(
    `Tests an empty geo-join query with a vega transform. Should render an empty ${vega.width}x${vega.height} image`,
    (() => {
      const width = vega.width;
      const height = vega.height;
      return new RenderVegaTest(vega, (result) =>
        expect(result).to.matchImage(ImageUtils.emptyPng(width, height))
      );
    })()
  );

  // Support last sample with ordinal scales
  vega = {
    width: 1600,
    height: 1120,
    data: [
      {
        name: 'backendChoropleth',
        format: 'polys',
        geocolumn: 'mapd_geo',
        sql:
          'SELECT zipcodes_2017.rowid, LAST_SAMPLE(ZCTA5CE10) as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid'
      }
    ],
    scales: [
      {
        name: 'backendChoropleth_fillColor',
        type: 'ordinal',
        domain: [ '94960', '94117', '55353', '19103', '10023' ],
        range: [
          'rgba(234,85,69,0.85)',
          'rgba(189,207,50,0.85)',
          'rgba(179,61,198,0.85)',
          'rgba(239,155,32,0.85)',
          'rgba(39,174,239,0.85)'
        ],
        nullValue: 'rgba(214, 215, 214, 0.65)',
        default: 'rgba(214, 215, 214, 0.65)'
      }
    ],
    projections: [
      {
        name: 'mercator_map_projection',
        type: 'mercator',
        bounds: {
          x: [ -124.88749638788404, -64.60538826379779 ],
          y: [ 20.1188223979657, 53.008194919853 ]
        }
      }
    ],
    marks: [
      {
        type: 'polys',
        from: {
          data: 'backendChoropleth'
        },
        properties: {
          x: {
            field: 'x'
          },
          y: {
            field: 'y'
          },
          fillColor: {
            scale: 'backendChoropleth_fillColor',
            field: 'color'
          },
          strokeWidth: 0
        },
        transform: {
          projection: 'mercator_map_projection'
        }
      }
    ]
  };
  test_grp.addTest(
    `Tests using the result of a LAST_SAMPLE column from a legacy poly query in an ordinal scale`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('various_poly_test_01.png')
    )
  );

  let case_stmt = 'CASE WHEN rowid IN (25101) THEN LAST_SAMPLE(ZCTA5CE10) END';
  vega = {
    width: 1600,
    height: 1120,
    data: [
      {
        name: 'backendChoropleth',
        format: 'polys',
        geocolumn: 'mapd_geo',
        sql: `SELECT zipcodes_2017.rowid, ${case_stmt} as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid`
      }
    ],
    scales: [
      {
        name: 'backendChoropleth_fillColor',
        type: 'ordinal',
        domain: [ '59301' ],
        range: [ 'red' ],
        nullValue: 'rgba(214, 215, 214, 0.65)',
        default: 'rgba(214, 215, 214, 0.65)'
      }
    ],
    projections: [
      {
        name: 'mercator_map_projection',
        type: 'mercator',
        bounds: {
          x: [ -124.88749638788404, -64.60538826379779 ],
          y: [ 20.1188223979657, 53.008194919853 ]
        }
      }
    ],
    marks: [
      {
        type: 'polys',
        from: {
          data: 'backendChoropleth'
        },
        properties: {
          x: {
            field: 'x'
          },
          y: {
            field: 'y'
          },
          fillColor: {
            scale: 'backendChoropleth_fillColor',
            field: 'color'
          },
          strokeWidth: 0
        },
        transform: {
          projection: 'mercator_map_projection'
        }
      }
    ]
  };
  test_grp.addTest(
    `Tests using LAST_SAMPLE in a CASE statement (${case_stmt}) from a legacy zipcodes poly query and use the result in an ordinal scale`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage('various_poly_test_02.png')
    )
  );

  vega = {
    width: 1163,
    height: 1057,
    data: [
      {
        name: 'backendChoropleth',
        format: 'polys',
        geocolumn: 'mapd_geo',
        sql:
          'SELECT us_states.rowid, contributions.contributor_state as key0, sum(amount) as color FROM contributions, us_states WHERE (contributions.contributor_state = us_states.STUSPS) GROUP BY us_states.rowid, key0'
      },
      {
        name: 'backendChoropleth_stats',
        source: 'backendChoropleth',
        transform: [
          {
            type: 'aggregate',
            fields: [ 'color', 'color', 'color', 'color' ],
            ops: [ 'min', 'max', 'avg', 'stddev' ],
            as: [ 'mincol', 'maxcol', 'avgcol', 'stdcol' ]
          },
          {
            type: 'formula',
            expr: 'max(mincol, avgcol-2*stdcol)',
            as: 'mincolor'
          },
          {
            type: 'formula',
            expr: 'min(maxcol, avgcol+2*stdcol)',
            as: 'maxcolor'
          }
        ]
      }
    ],
    scales: [
      {
        name: 'backendChoropleth_fillColor',
        type: 'quantize',
        domain: {
          data: 'backendChoropleth_stats',
          fields: [ 'mincolor', 'maxcolor' ]
        },
        range: [
          'rgba(17,95,154,0.85)',
          'rgba(25,132,197,0.85)',
          'rgba(34,167,240,0.85)',
          'rgba(72,181,196,0.85)',
          'rgba(118,198,143,0.85)',
          'rgba(166,215,91,0.85)',
          'rgba(201,229,47,0.85)',
          'rgba(208,238,17,0.85)',
          'rgba(208,244,0,0.85)'
        ],
        nullValue: 'rgba(214, 215, 214, 0.65)',
        default: 'rgba(214, 215, 214, 0.65)'
      }
    ],
    projections: [
      {
        name: 'mercator_map_projection',
        type: 'mercator',
        bounds: {
          x: [ -170.0945829750607, -64.53998280309563 ],
          y: [ 11.995988718699394, 72.73829971440733 ]
        }
      }
    ],
    marks: [
      {
        type: 'polys',
        from: { data: 'backendChoropleth' },
        properties: {
          x: { field: 'x' },
          y: { field: 'y' },
          fillColor: {
            scale: 'backendChoropleth_fillColor',
            field: 'color'
          },
          strokeWidth: 0
        },
        transform: { projection: 'mercator_map_projection' }
      }
    ]
  };

  // TODO(croot): when debugging locally on 04/12/19, I found that any integer types passed through thrift
  // via its node interface was not being fully flattened and instead was being returned as a Buffer, not
  // a number... However other types (like double) worked appropriately. This unfortunately was preventing
  // me from doing sql-based checking of vega-metadata.. Once thrift gets its act together, I'd love to add
  // the sql-based checks here
  // For now, the expected numeric values [25552, 2885625151.281089] were calculated by hand running the
  // following query:
  //   SELECT
  //     min(c.color) as mincolor,
  //     max(c.color) as maxcolor,
  //     avg(c.color) as avgcolor,
  //     stddev(c.color) as stdcol
  //   FROM (
  //     SELECT
  //       us_states.rowid,
  //       contributions.contributor_state as key0,
  //       sum(amount) as color
  //     FROM contributions, us_states
  //     WHERE (contributions.contributor_state = us_states.STUSPS) GROUP BY us_states.rowid, key0
  //   ) as c;
  //
  // And then applying the formulas from the vega transforms.
  test_grp.addTest(
    `Tests using a big-int column from a geo-join query in a vega transform. Query used: "${vega
      .data[0].sql}"`,
    new RenderVegaTest(vega, (result) => {
      expect(result).to.matchGoldenImage('various_poly_test_03.png');
      expect(result).to.have.vega_metadata.with
        .scale('backendChoropleth_fillColor')
        .with.property('domain')
        .that.is.closeTo([ 25552, 2885625151.281089 ], 0.000001);
    })
  );

  vega = {
    width: 897,
    height: 654,
    data: [
      {
        name: 'backendChoropleth',
        format: 'polys',
        geocolumn: 'mapd_geo',
        sql:
          'SELECT flights_123M.dest_state as key0, avg(arrdelay) as color, LAST_SAMPLE(us_states.rowid) as rowid FROM flights_123M, us_states WHERE (flights_123M.dest_state = us_states.STUSPS) GROUP BY key0'
      },
      {
        name: 'backendChoropleth_stats',
        source: 'backendChoropleth',
        transform: [
          {
            type: 'aggregate',
            fields: [ 'color', 'color', 'color', 'color' ],
            ops: [ 'min', 'max', 'avg', 'stddev' ],
            as: [ 'mincol', 'maxcol', 'avgcol', 'stdcol' ]
          },
          {
            type: 'formula',
            expr: 'max(mincol, avgcol-2*stdcol)',
            as: 'mincolor'
          },
          {
            type: 'formula',
            expr: 'min(maxcol, avgcol+2*stdcol)',
            as: 'maxcolor'
          }
        ]
      }
    ],
    scales: [
      {
        name: 'backendChoropleth_fillColor',
        type: 'quantize',
        domain: {
          data: 'backendChoropleth_stats',
          fields: [ 'mincolor', 'maxcolor' ]
        },
        range: [
          'rgba(17,95,154,0.85)',
          'rgba(25,132,197,0.85)',
          'rgba(34,167,240,0.85)',
          'rgba(72,181,196,0.85)',
          'rgba(118,198,143,0.85)',
          'rgba(166,215,91,0.85)',
          'rgba(201,229,47,0.85)',
          'rgba(208,238,17,0.85)',
          'rgba(208,244,0,0.85)'
        ],
        nullValue: 'rgba(214, 215, 214, 0.65)',
        default: 'rgba(214, 215, 214, 0.65)'
      }
    ],
    projections: [
      {
        name: 'mercator_map_projection',
        type: 'mercator',
        bounds: {
          x: [ -179.14890899999722, 179.77846999999684 ],
          y: [ -65.04498263324443, 84.62611050562805 ]
        }
      }
    ],
    marks: [
      {
        type: 'polys',
        from: {
          data: 'backendChoropleth'
        },
        properties: {
          x: {
            field: 'x'
          },
          y: {
            field: 'y'
          },
          fillColor: {
            scale: 'backendChoropleth_fillColor',
            field: 'color'
          },
          strokeWidth: 0
        },
        transform: {
          projection: 'mercator_map_projection'
        }
      }
    ]
  };
  test_grp.addTest(
    `Tests using a small-int column from a geo-join query in a vega transform. Query used: "${vega
      .data[0].sql}"`,
    new RenderVegaTest(vega, (result) => {
      expect(result).to.matchGoldenImage('various_poly_test_04.png');
      expect(result).to.have.vega_metadata.with
        .scale('backendChoropleth_fillColor')
        .with.property('domain')
        .that.is.closeTo([ 3.3737057220377205, 10.91844987311368 ], 0.00000000001);
    })
  );

  test_collection.addTestGroup(test_grp);
};
