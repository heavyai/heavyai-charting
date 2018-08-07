const mic = require("mocha-image-compare");
const MapdCon = require("@mapd/connector")
const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
// chai.use(chaiAsPromised)
const expect = chai.expect
const should = chai.should

function render_test_vega(context, con, vega, golden_image, done) {
  con.renderVega(1, JSON.stringify(vega), {}, (error, results) => {
    if (error) {
      done(error)
    }
    const buffer = Buffer.from(results.image, 'base64')
    const compare = mic.test(context)
    compare(golden_image, buffer, done)
  })
}

function render_test_vega_with_error(context, con, vega) {
  con.renderVega(1, JSON.stringify(vega), {}, (error, results) => {
    if (error) {
      throw error
    }
    return results
  })
}

describe('BE render vega tests', function() {
  var con = null;
  before(function(done) {
    con = new MapdCon()
      .protocol('http')
      .host('localhost')
      .port('1024')
      .dbName('mapd')
      .user('mapd')
      .password('HyperInteractive')
      .connect((error, con) => {
        if (error) {
          done(error);
        } else {
          done();
        }
      })
    });
  after(function(done) {
    con.disconnect((error, con) => {
      if (error) {
        done(error);
      } else {
        done();
      }
    });
  })
  describe('Zipcode Poly Render Tests', function() {
    let zipcode_vega = null
    beforeEach(function() {
      zipcode_vega = {
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
    })

    it('should render zipcodes polygons red using mercator projection', function(done) {
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_1.png', done)
    });

    it('should render zipcodes polygons red with a blue stroke of width 1px', function(done) {
      zipcode_vega.marks[0].properties.strokeColor = "blue"
      zipcode_vega.marks[0].properties.strokeWidth = 1
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_2.png', done)
    })

    it('should properly turn off stroking and re-render red polygons', function(done) {
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_1.png', done)
    })

    it ('should render zipcodes with a transparent fill color and blue stroke of width 1px', function(done) {
      zipcode_vega.marks[0].properties.fillColor = "rgba(0,0,0,0)"
      zipcode_vega.marks[0].properties.strokeColor = "blue"
      zipcode_vega.marks[0].properties.strokeWidth = 1
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_3.png', done)
    })

    it('should add back in a fully opaque red fill with a blue stroke of width 1px', function(done) {
      zipcode_vega.marks[0].properties.strokeColor = "blue"
      zipcode_vega.marks[0].properties.strokeWidth = 1
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_2.png', done)
    })

    it ('should render zipcodes with a transparent fill color and blue stroke of width 1px using fillOpacity', function(done) {
      zipcode_vega.marks[0].properties.fillOpacity = 0.0
      zipcode_vega.marks[0].properties.strokeColor = "blue"
      zipcode_vega.marks[0].properties.strokeWidth = 1
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_3.png', done)
    })
  })

  describe('Zipcode Poly Render Tests with Ordinal Scales', function() {
    let zipcode_vega = null
    beforeEach(function() {
      zipcode_vega = {
        "width": 733,
        "height": 530,
        "data": [
          {
            "name": "polys",
            "format": "polys",
            "sql": "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE '55___'"
          }
        ],
        "projections": [
          {
            "name": "merc",
            "type": "mercator",
            "bounds": {
              "x": [-124.390, -66.94],
              "y": [20.6157, 52.9312]
            }
          }
        ],
        "scales": [
          {
            "name": "polys_fillColor",
            "type": "ordinal",
            "domain": ["89049"],
            "range": ["red"],
            "default": "blue",
            "nullValue": "#cacaca"
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
              "fillColor": {
                "scale": "polys_fillColor",
                "field": "color"
              }
            },
            "transform": {
              "projection": "merc"
            }
          }
        ]
      }
    })
    it('should render the zipcode 89049 red, the rest blue', function(done) {
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_4.png', done)
    });

    it('should render an empty image because the results of the query is empty', function(done) {
      zipcode_vega.data[0].sql = "SELECT rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE 'ab___'"
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_5.png', done)
    });
  })

  describe('Zipcode Poly Render Tests with Quantitative Scales', function() {
    let zipcode_vega = null
    beforeEach(function() {
      zipcode_vega = {
        "width": 793,
        "height": 1060,
        "data": [
          {
            "name": "table",
            "sql": "SELECT ALAND10, rowid FROM zipcodes_2017",
            "format": "polys"
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
        "scales": [
          {
            "name": "color",
            "type": "linear",
            "domain": [1,880000000],
            "range": ["blue","red"],
            "clamp": true
          }
        ],
        "marks": [
          {
            "type": "polys",
            "from": {"data": "table"},
            "properties": {
              "x": {"field": "x"},
              "y": {"field": "y"},
              "fillColor": {"scale": "color","field": "ALAND10"}
            },
            "transform": {
              "projection": "merc"
            }
          }
        ]
      }
    })

    it('should render zipcodes from blue-to-red based on land area size', function(done) {
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_6.png', done)
    });

    it('properly uses a sqrt quantitative scale for fill color', function(done) {
      zipcode_vega.scales[0].type = "sqrt"
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_7.png', done)
    });

    it('properly uses a log quantitative scale for fill color', function(done) {
      zipcode_vega.scales[0].type = "log"
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_8.png', done)
    });

    it('properly uses a pow quantitative scale for fill color', function(done) {
      zipcode_vega.scales[0].type = "pow"
      zipcode_vega.scales[0].exponent = 1
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_9.png', done)
    });

    it('uses a pow quantitative scale for fill color with an exponent of 2', function(done) {
      zipcode_vega.scales[0].type = "pow"
      zipcode_vega.scales[0].exponent = 2
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_10.png', done)
    });

    it('uses a pow quantitative scale for fill color with an exponent of 0.25', function(done) {
      zipcode_vega.scales[0].type = "pow"
      zipcode_vega.scales[0].exponent = 0.25
      render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_11.png', done)
    });

    it('should throw an error due to a negative number for a scale domain', function(done) {
      zipcode_vega.scales[0].type = "sqrt"
      zipcode_vega.scales[0].domain = [-1, 880000000]
      (function() {
        con.renderVega(1, JSON.stringify(zipcode_vega), {}, (error, result) => {
          if (error) {
            throw error
          }
          return result
        });
      }).should.throw()
      // render_test_vega_with_error(this, con, zipcode_vega).should.throw()
    });

    // it('properly uses a sqrt quantitative scale for fill color', function(done) {
    //   zipcode_vega.scales[0].type = "sqrt"
    //   render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_7.png', done)
    // });

    // it('properly uses a log quantitative scale for fill color', function(done) {
    //   zipcode_vega.scales[0].type = "log"
    //   render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_8.png', done)
    // });

    // it('properly uses a pow quantitative scale for fill color', function(done) {
    //   zipcode_vega.scales[0].type = "pow"
    //   zipcode_vega.scales[0].exponent = 1
    //   render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_9.png', done)
    // });

    // it('uses a pow quantitative scale for fill color with an exponent of 2', function(done) {
    //   zipcode_vega.scales[0].type = "pow"
    //   zipcode_vega.scales[0].exponent = 2
    //   render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_10.png', done)
    // });

    // it('uses a pow quantitative scale for fill color with an exponent of 0.25', function(done) {
    //   zipcode_vega.scales[0].type = "pow"
    //   zipcode_vega.scales[0].exponent = 0.25
    //   render_test_vega(this, con, zipcode_vega, '/home/chris/src/MapD/mapd-charting/test/poly_render_test_11.png', done)
    // });
  })
})

    // describe('Array', function() {
    //   describe('#indexOf()', function() {
    //     it('should return -1 when the value is not present', function() {
    //       assert.equal([1,2,3].indexOf(4), -1);
    //     });
    //   });
    // });