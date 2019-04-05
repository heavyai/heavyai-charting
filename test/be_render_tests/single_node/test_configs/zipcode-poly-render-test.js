let expect = null;

const base_zipcode_vega = {
  "width": 793,
  "height": 1060,
  "data": [
    {
      "name": "polys",
      "format": "polys",
      "sql": "SELECT rowid from zipcodes_2017"
    }
  ],
  "projections": [
    {
      "name": "merc",
      "type": "mercator",
      "bounds": {
        "x": [-113.154, -81.846],
        "y": [22.0, 54.0]
      }
    }
  ],
  "marks": [
    {
      "type": "polys",
      "from": {
        "data": "polys"
      },
      "properties": {
        "x": {
          "field": "x"
        },
        "y": {
          "field": "y"
        },
        "fillColor": "red",
      },
      "transform": {
        "projection": "merc"
      }
    }
  ]
}

function jsonCopy(src) {
  return JSON.parse(JSON.stringify(src));
}

let curr_idx = 0
const tests = [
  {
    test_name: "poly_render_test_1",
    test_desc: "Should render all zipcode polygons red using mercator projection",
    test_endpoint: {
      command: "renderVega",
      args: {
        widgetId: 1,
        vega: base_zipcode_vega
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_1.png');
      }
    }
  },
  {
    test_name: "poly_render_test_2",
    test_desc: "Should render all zipcode polygons red with a blue stroke of width 1px",
    test_endpoint: {
      command: "renderVega",
      args: {
        widgetId: 1,
        vega: (() => {
          const stroke_vega = jsonCopy(base_zipcode_vega);
          stroke_vega.width = 500;
          stroke_vega.marks[0].properties.strokeColor = "blue";
          stroke_vega.marks[0].properties.strokeWidth = 1;
          return stroke_vega;
        })()
      },
      expectation: (result) => {
        expect(result).to.have.image.that.matchesGoldenImage('poly_render_test_2.png');
      }
    }
  },
  // {
  //   test_name: "poly_render_test_3",
  //   test_desc: "Should properly turn off stroking and re-render red polygons",
  //   test_endpoint: {
  //     command: "renderVega",
  //     args: {
  //       widgetId: 1,
  //       vega: base_zipcode_vega
  //     },
  //     expectation: (error, result) => {
  //       expect(error).to.be.null;
  //       expect(result).to.have.property('image').that.matchesGoldenImage('poly_render_test_2.png');
  //     }
  //   }
  // }
]

module.exports = function(chai) {
  expect = chai.expect;
  return {
    test_desc: "Tests a handful of vega renders against the zipcode poly table.",
    getNextTest: () => tests[curr_idx++]
  }
}

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