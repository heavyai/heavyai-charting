let expect = null;

const base_zipcode_vega = {
  width: 793,
  height: 1060,
  data: [
    {
      name: 'polys',
      format: 'polys',
      sql: 'SELECT rowid from zipcodes_2017'
    }
  ],
  projections: [
    {
      name: 'merc',
      type: 'mercator',
      bounds: {
        x: [ -113.154, -81.846 ],
        y: [ 22.0, 54.0 ]
      }
    }
  ],
  marks: [
    {
      type: 'polys',
      from: {
        data: 'polys'
      },
      properties: {
        x: {
          field: 'x'
        },
        y: {
          field: 'y'
        },
        fillColor: 'red'
      },
      transform: {
        projection: 'merc'
      }
    }
  ]
};

const base_quant_scale_zipcode_vega = {
  width: 793,
  height: 1060,
  data: [
    {
      name: 'table',
      sql: 'SELECT ALAND10, rowid FROM zipcodes_2017',
      format: 'polys'
    }
  ],
  projections: [
    {
      name: 'merc',
      type: 'mercator',
      bounds: {
        x: [ -113.154, -81.846 ],
        y: [ 22.0, 54.0 ]
      }
    }
  ],
  scales: [
    {
      name: 'color',
      type: 'linear',
      domain: [ 1, 880000000 ],
      range: [ 'blue', 'red' ],
      clamp: true
    }
  ],
  marks: [
    {
      type: 'polys',
      from: { data: 'table' },
      properties: {
        x: { field: 'x' },
        y: { field: 'y' },
        fillColor: { scale: 'color', field: 'ALAND10' }
      },
      transform: {
        projection: 'merc'
      }
    }
  ]
};

function jsonCopy(src) {
  return JSON.parse(JSON.stringify(src));
}

let curr_idx = 0;
const tests = [
  {
    test_name: 'zipcode_render_test_1',
    test_desc: 'Should render all zipcode polygons red using mercator projection',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: base_zipcode_vega
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_1.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_2',
    test_desc: 'Should render all zipcode polygons red with a blue stroke of width 1px',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const stroke_vega = jsonCopy(base_zipcode_vega);
          stroke_vega.marks[0].properties.strokeColor = 'blue';
          stroke_vega.marks[0].properties.strokeWidth = 1;
          return stroke_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_2.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_3',
    test_desc: 'Should properly update state and re-render all zipcode polygons red',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: base_zipcode_vega
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_1.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_4',
    test_desc:
      'Should render all zipcode polygons with a blue stroke of width 1px and a fully transparent fill color',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const stroke_vega = jsonCopy(base_zipcode_vega);
          stroke_vega.marks[0].properties.strokeColor = 'blue';
          stroke_vega.marks[0].properties.strokeWidth = 1;
          stroke_vega.marks[0].properties.fillColor = 'rgba(0,0,0,0)';
          return stroke_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_3.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_5',
    test_desc:
      'Should properly update state and re-render zipcode polygons red with a blue stroke of width 1px',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const stroke_vega = jsonCopy(base_zipcode_vega);
          stroke_vega.marks[0].properties.strokeColor = 'blue';
          stroke_vega.marks[0].properties.strokeWidth = 1;
          return stroke_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_2.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_6',
    test_desc:
      'Should properly update state and re-render zipcode polygons with a blue stroke of width 1px and a fully transparent fill color',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const stroke_vega = jsonCopy(base_zipcode_vega);
          stroke_vega.marks[0].properties.strokeColor = 'blue';
          stroke_vega.marks[0].properties.strokeWidth = 1;
          stroke_vega.marks[0].properties.fillColor = 'rgba(0,0,0,0)';
          return stroke_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_3.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_7',
    test_desc:
      'Should render only the zipcodes starting with "55" with a blue fill color',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: {
          width: 733,
          height: 530,
          data: [
            {
              name: 'polys',
              format: 'polys',
              sql:
                "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE '55___'"
            }
          ],
          projections: [
            {
              name: 'merc',
              type: 'mercator',
              bounds: {
                x: [ -124.39, -66.94 ],
                y: [ 20.6157, 52.9312 ]
              }
            }
          ],
          scales: [
            {
              name: 'polys_fillColor',
              type: 'ordinal',
              domain: [ '89049' ],
              range: [ 'red' ],
              default: 'blue',
              nullValue: '#cacaca'
            }
          ],
          marks: [
            {
              type: 'polys',
              from: {
                data: 'polys'
              },
              properties: {
                x: {
                  field: 'x'
                },
                y: {
                  field: 'y'
                },
                fillColor: {
                  scale: 'polys_fillColor',
                  field: 'color'
                }
              },
              transform: {
                projection: 'merc'
              }
            }
          ]
        }
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_4.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_8',
    test_desc:
      'Should render an empty 733x530 image as the query should result in 0 rows',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: {
          width: 733,
          height: 530,
          data: [
            {
              name: 'polys',
              format: 'polys',
              sql:
                "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE 'ab___'"
            }
          ],
          projections: [
            {
              name: 'merc',
              type: 'mercator',
              bounds: {
                x: [ -124.39, -66.94 ],
                y: [ 20.6157, 52.9312 ]
              }
            }
          ],
          scales: [
            {
              name: 'polys_fillColor',
              type: 'ordinal',
              domain: [ '89049' ],
              range: [ 'red' ],
              default: 'blue',
              nullValue: '#cacaca'
            }
          ],
          marks: [
            {
              type: 'polys',
              from: {
                data: 'polys'
              },
              properties: {
                x: {
                  field: 'x'
                },
                y: {
                  field: 'y'
                },
                fillColor: {
                  scale: 'polys_fillColor',
                  field: 'color'
                }
              },
              transform: {
                projection: 'merc'
              }
            }
          ]
        }
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_5.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_9',
    test_desc: 'Uses a linear scale to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: base_quant_scale_zipcode_vega
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_6.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_10',
    test_desc: 'Uses a sqrt scale to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const sqrt_vega = jsonCopy(base_quant_scale_zipcode_vega);
          sqrt_vega.scales[0].type = 'sqrt';
          return sqrt_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_7.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_11',
    test_desc: 'Uses a log scale to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const log_vega = jsonCopy(base_quant_scale_zipcode_vega);
          log_vega.scales[0].type = 'log';
          return log_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_8.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_12',
    test_desc:
      'Uses a pow scale with an exponent of 1 to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const pow_vega = jsonCopy(base_quant_scale_zipcode_vega);
          pow_vega.scales[0].type = 'pow';
          pow_vega.scales[0].exponent = 1;
          return pow_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_9.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_13',
    test_desc:
      'Uses a pow scale with an exponent of 2 to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const pow_vega = jsonCopy(base_quant_scale_zipcode_vega);
          pow_vega.scales[0].type = 'pow';
          pow_vega.scales[0].exponent = 2;
          return pow_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_10.png');
      }
    }
  },
  {
    test_name: 'zipcode_render_test_14',
    test_desc:
      'Uses a pow scale with an exponent of 0.25 to color zipcodes according to land area',
    test_endpoint: {
      command: 'renderVega',
      args: {
        widget_id: 1,
        vega: (() => {
          const pow_vega = jsonCopy(base_quant_scale_zipcode_vega);
          pow_vega.scales[0].type = 'pow';
          pow_vega.scales[0].exponent = 0.25;
          return pow_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_11.png');
      }
    }
  }

  // {
  // 	test_name: 'CROOT_vega_metadata_test',
  // 	test_desc: 'Testing vega metadata',
  // 	test_endpoint: {
  // 		command: 'renderVega',
  // 		args: {
  // 			widget_id: 1,
  // 			vega: {
  // 				width: 1089,
  // 				height: 1072,
  // 				data: [
  // 					{
  // 						name: 'table',
  // 						sql:
  // 							'SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, followers, rowid FROM tweets_nov_feb_60M WHERE MOD( MOD (rowid, 4294967296) * 2654435761 , 4294967296) < 710678295 AND ((lon >= -103.4379998203278 AND lon <= -64.40185741069203) AND (lat >= 22.931694494036606 AND lat <= 50.50577924233724))'
  // 					},
  // 					{
  // 						name: 'xformtable',
  // 						source: 'table',
  // 						transform: [
  // 							{
  // 								type: 'aggregate',
  // 								fields: [ 'followers', 'followers', 'followers', 'followers' ],
  // 								ops: [ 'min', 'max', 'avg', 'stddev' ],
  // 								as: [ 'minfol', 'maxfol', 'avgfol', 'stdfol' ]
  // 							},
  // 							{
  // 								type: 'formula',
  // 								expr: 'max(minfol, avgfol-2*stdfol)',
  // 								as: 'minfoltouse'
  // 							},
  // 							{
  // 								type: 'formula',
  // 								expr: 'min(maxfol, avgfol+2*stdfol)',
  // 								as: 'maxfoltouse'
  // 							}
  // 						]
  // 					}
  // 				],
  // 				scales: [
  // 					{
  // 						name: 'x',
  // 						type: 'linear',
  // 						domain: [ -11514665.467093747, -7169181.972115603 ],
  // 						range: 'width'
  // 					},
  // 					{
  // 						name: 'y',
  // 						type: 'linear',
  // 						domain: [ 2623760.3291164604, 6534333.04895864 ],
  // 						range: 'height'
  // 					},
  // 					{
  // 						name: 'size',
  // 						type: 'linear',
  // 						domain: {
  // 							data: 'xformtable',
  // 							fields: [ 'minfol', 'maxfol' ]
  // 						},
  // 						range: [ 1, 20 ],
  // 						clamp: true
  // 					},
  // 					{
  // 						name: 'color',
  // 						type: 'linear',
  // 						domain: {
  // 							data: 'xformtable',
  // 							fields: [ 'minfoltouse', 'maxfoltouse' ]
  // 						},
  // 						range: [ 'rgb(0,0,255)', 'rgb(255,0,0)' ],
  // 						clamp: true
  // 					}
  // 				],
  // 				marks: [
  // 					{
  // 						type: 'points',
  // 						from: { data: 'table' },
  // 						properties: {
  // 							x: { scale: 'x', field: 'x' },
  // 							y: { scale: 'y', field: 'y' },
  // 							fillColor: { scale: 'color', field: 'followers' },
  // 							size: { scale: 'size', field: 'followers' }
  // 						}
  // 					}
  // 				]
  // 			}
  // 		},
  // 		expectation: (result) => {
  // 			// expect(result).to.have.image.that.matchesGoldenImage(
  // 			// 	'CROOT_vega_metadata_test.png'
  // 			// );
  // 			expect(result).to.have.vega_metadata.with
  // 				.scale('color')
  // 				.with.property('domain')
  // 				.that.is.closeTo([ -1, 22459.9636719 ], 0.0000001);

  // 			expect(result).to.have.vega_metadata.with
  // 				.scale('size')
  // 				.with.property('domain')
  // 				.that.eql([ -1, 3064375 ]); // deep equality check
  // 		}
  // 	}
  // },
  // {
  // 	test_name: 'CROOT_poly_hittest_render',
  // 	test_desc: 'Testing poly hit-testing',
  // 	test_endpoint: {
  // 		command: 'renderVega',
  // 		args: {
  // 			widget_id: 1,
  // 			vega: {
  // 				width: 1183,
  // 				height: 1059,
  // 				data: [
  // 					{
  // 						name: 'zipcodes',
  // 						format: 'polys',
  // 						sql: 'SELECT rowid from zipcodes_2017'
  // 					}
  // 				],
  // 				projections: [
  // 					{
  // 						name: 'merc',
  // 						type: 'mercator',
  // 						bounds: {
  // 							x: [ -122.57, -122.1 ],
  // 							y: [ 37.61, 37.94 ]
  // 						}
  // 					}
  // 				],
  // 				marks: [
  // 					{
  // 						type: 'polys',
  // 						from: { data: 'zipcodes' },
  // 						properties: {
  // 							x: { field: 'x' },
  // 							y: { field: 'y' },
  // 							fillColor: 'red',
  // 							strokeColor: 'black',
  // 							strokeWidth: 1,
  // 							lineJoin: 'round'
  // 						},
  // 						transform: { projection: 'merc' }
  // 					}
  // 				]
  // 			}
  // 		},
  // 		expectation: (result) => {
  // 			expect(result).to.have.image.that.matchesGoldenImage(
  // 				'CROOT_vega_poly_hittest.png'
  // 			);
  // 		}
  // 	}
  // },
  // {
  // 	test_name: 'CROOT_poly_hittest',
  // 	test_desc: 'Testing poly hit-testing',
  // 	test_endpoint: {
  // 		command: 'getResultRowForPixel',
  // 		args: {
  // 			widget_id: 1,
  // 			pixel: { x: 326, y: 1059 - 544 - 1 },
  // 			table_col_names: {
  // 				zipcodes: [ 'ZCTA5CE10', 'mapd_geo' ]
  // 			}
  // 		},
  // 		expectation: (result) => {
  // 			expect(result).to.have.column('ZCTA5CE10').that.equals('94117');

  // 			const expected_wkt =
  // 				'MULTIPOLYGON (((-122.477296992427 37.7660689771949,-122.47737896744 37.7654819925155,-122.458404937041 37.7661599627538,-122.457789956805 37.7660149977384,-122.457535985139 37.7635659732686,-122.455998995554 37.7639039735142,-122.456993927461 37.7618419834235,-122.459172970829 37.761911972315,-122.45594392645 37.7602389863507,-122.456602995497 37.7592349600788,-122.454001923303 37.7587849776069,-122.451816928783 37.7594529733804,-122.447681968309 37.7591899911683,-122.446782925374 37.7617809631684,-122.445308967701 37.7618799953544,-122.442914928516 37.7636479901912,-122.443346931806 37.765332962277,-122.441241984461 37.7652709781031,-122.438199940342 37.7671589598838,-122.435623930039 37.7673279809613,-122.435793998854 37.7690579638672,-122.429127955078 37.7694559785395,-122.428425970687 37.7704519581843,-122.42917799504 37.7741809830881,-122.429928929745 37.7779089602539,-122.430114924177 37.7788419918059,-122.444966986051 37.7769579914291,-122.444779985791 37.7760169970691,-122.446470950938 37.7758019593432,-122.446845957286 37.777668986366,-122.453187956686 37.7768529661823,-122.452809932853 37.7749949916149,-122.463748987049 37.7736239637125,-122.464610981971 37.7724399779795,-122.459161990536 37.7713139950164,-122.45990093912 37.7704419837196,-122.464401937306 37.7696689626992,-122.467003931509 37.7680129919984,-122.469757973435 37.7692089638529,-122.472244967926 37.768609993052,-122.473123978112 37.7671159607205,-122.477296992427 37.7660689771949)))';
  // 			expect(result).to.have.column('mapd_geo').that.wktEquals(expected_wkt, 0.000001);
  // 		}
  // 	}
  // }
  // {
  //   test_name: 'poly_render_test_3',
  //   test_desc: 'Should properly turn off stroking and re-render red polygons',
  //   test_endpoint: {
  //     command: 'renderVega',
  //     args: {
  //       widget_id: 1,
  //       vega: (() => {
  //         const error_vega = jsonCopy(base_zipcode_vega);
  //         error_vega.width = -1;
  //         return error_vega;
  //       })()
  //     },
  //     expectation: (result) => {
  //       expect(result).to.be.a.vegaParseError('/width');
  //     }
  //   }
  // }
];

module.exports = function(chai) {
  expect = chai.expect;

  return {
    test_desc: 'Tests a handful of vega renders against the zipcode poly table.',
    // after: async function(conn) {
    //   await conn.clearGpuMemoryAsync();
    // },
    getNextTest: () => tests[curr_idx++]
  };
};

//   beforeEach(function() {
//     zipcode_vega = {
//       "width": 793,
//       "height": 1060,
//       "data": [
//         {
//           "name": "polys",
//           "format": "polys",
//           "sql": "SELECT rowid from zipcodes_2017"
//         }
//       ],
//       "projections": [
//         {
//           "name": "merc",
//           "type": "mercator",
//           "bounds": {
//             "x": [-113.154, -81.846],
//             "y": [22.0, 54.0]
//           }
//         }
//       ],
//       "marks": [
//         {
//           "type": "polys",
//           "from": {
//             "data": "polys"
//           },
//           "properties": {
//             "x": {
//               "field": "x"
//             },
//             "y": {
//               "field": "y"
//             },
//             "fillColor": "red",
//           },
//           "transform": {
//             "projection": "merc"
//           }
//         }
//       ]
//     }
//   })

//   it('should render zipcodes polygons red using mercator projection', function(done) {
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_1.png', done)
//   });

//   it('should render zipcodes polygons red with a blue stroke of width 1px', function(done) {
//     zipcode_vega.marks[0].properties.strokeColor = "blue"
//     zipcode_vega.marks[0].properties.strokeWidth = 1
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_2.png', done)
//   })

//   it('should properly turn off stroking and re-render red polygons', function(done) {
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_1.png', done)
//   })

//   it ('should render zipcodes with a transparent fill color and blue stroke of width 1px', function(done) {
//     zipcode_vega.marks[0].properties.fillColor = "rgba(0,0,0,0)"
//     zipcode_vega.marks[0].properties.strokeColor = "blue"
//     zipcode_vega.marks[0].properties.strokeWidth = 1
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_3.png', done)
//   })

//   it('should add back in a fully opaque red fill with a blue stroke of width 1px', function(done) {
//     zipcode_vega.marks[0].properties.strokeColor = "blue"
//     zipcode_vega.marks[0].properties.strokeWidth = 1
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_2.png', done)
//   })

//   it ('should render zipcodes with a transparent fill color and blue stroke of width 1px using fillOpacity', function(done) {
//     zipcode_vega.marks[0].properties.fillOpacity = 0.0
//     zipcode_vega.marks[0].properties.strokeColor = "blue"
//     zipcode_vega.marks[0].properties.strokeWidth = 1
//     render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_3.png', done)
//   })
// })
