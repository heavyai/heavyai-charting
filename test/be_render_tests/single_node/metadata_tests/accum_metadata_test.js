const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");

module.exports = function(test_collection, expect) {
  const accum_metadata_test_grp = test_collection.createTestGroup({
    test_description: `Tests a handful of vega renders to validate metadata returned from accumulation renders`,
    golden_img_dir: `./golden_images`
  });

  accum_metadata_test_grp.addTest(
    `Tests vega metadata from a simple density accumulation render using min/max pixel count range`,
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
            "name": "pointmap_fillColor",
            "type": "linear",
            "domain": [0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1],
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
              "fillColor": {"scale": "pointmap_fillColor","value": 0},
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
        expect(result).to.matchGoldenImage("accum_metadata_test_01.png");
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(1);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(3);
      }
    )
  );

  // this test renders all the flights where the destination is in California.
  // This test is controlled such that non of the airports overlap with one another,
  // so the pixel counts for the density accumulation should equal that of a 'GROUP BY dest_name' aggregate.

  // prettier-ignore
  let vega = {
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
        "domain": [-14023882.296463663,-12457338.630701207],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [3599731.6180461347,5156205.673467735],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [0,0.5,1],
        "range": [
          "rgb(17,95,154)",
          "rgb(118,198,143)",
          "rgb(208,244,0)"
        ],
        "accumulator": "density",
        "minDensityCnt": "min",
        "maxDensityCnt": "max",
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
          "fillColor": {"scale": "pointmap_fillColor","value": 0},
          "shape": "circle",
          "width": 10,
          "height": 10
        }
      }
    ]
  };

  let prev_test_name = accum_metadata_test_grp.addTest(
    `Tests a higher-cardinality density accumulation render using min/max pixel count range.`,
    new RenderVegaTest(vega, (result) => {
      expect(result).to.matchGoldenImage("accum_metadata_test_02.png");

      // The minDensityCnt here should be all the flights where the destination was the airport
      // 'Palmdale Production Flight'. You can get at this value if you run:
      // "SELECT count(*) FROM flights WHERE dest_name like 'Palmdale Production Flight';"
      expect(result).to.have.vega_metadata.with
        .scale("pointmap_fillColor")
        .with.property("minDensityCnt")
        .to.equal(729);

      // The maxDensityCnt here should be all the flights where the destination was the airport
      // 'Los Angeles International'. You can get at this value if you run:
      // "SELECT count(*) FROM flights WHERE dest_name like 'Los Angeles International';"
      expect(result).to.have.vega_metadata.with
        .scale("pointmap_fillColor")
        .with.property("maxDensityCnt")
        .to.equal(215685);
    })
  );

  // this test is similar to the previous test except the points are sized up somewhat so that there's overlap
  // between a handful of airports. The maxDensityCnt should equal the sum of the counts of flights that landed
  // at LAX & BUR
  prev_test_name = accum_metadata_test_grp.addTest(
    `Tests min/max density accumulation metadata with slightly more overlap than the test in ${prev_test_name}.`,
    new RenderVegaTest(
      ((vega) => {
        vega.marks[0].properties.width = 30;
        vega.marks[0].properties.height = 30;
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_03.png");

        // The minDensityCnt here should be all the flights where the destination was the airport
        // 'Palmdale Production Flight'. You can get at this value if you run:
        // "SELECT count(*) FROM flights WHERE dest_name like 'Palmdale Production Flight';"
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(729);

        // The maxDensityCnt here should be all the flights where the destination was the airport
        // 'Los Angeles International' & 'Burbank-Glendale-Pasadena'. You can get at this value if you run:
        // "SELECT count(*) FROM flights WHERE dest_name like 'Los Angeles International';"
        // and add that with the result of:
        // "SELECT count(*) FROM flights WHERE dest_name like 'Burbank-Glendale-Pasadena';"
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(247088);
      }
    )
  );

  // now test some stddev using the previous test
  accum_metadata_test_grp.addTest(
    `Tests 1st stddev accumulation metadata using the same render settings as ${prev_test_name}.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[2].minDensityCnt = "-1stStdDev";
        vega.scales[2].maxDensityCnt = "1stStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_04.png");
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(32304.876147086965);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(33073.04072281018);
      }
    )
  );

  // This only renders the LAX flights, so the minDensityCnt & maxDensityCnt should be exactly the same
  accum_metadata_test_grp.addTest(
    `Tests 1st stddev accumulation metadata using a render where all pixel counts are the same.`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, rowid FROM flights WHERE dest_name like 'Los Angeles International'";
        vega.scales[2].minDensityCnt = "-1stStdDev";
        vega.scales[2].maxDensityCnt = "1stStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_05.png");

        // min/max density cnts should be exactly the same and should equal the number of LAX-dest flights
        // Should equal: "SELECT count(*) FROM flights WHERE dest_name like 'Los Angeles International'"";
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(215685);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(215685);
      }
    )
  );

  // now test some 2nd stddev tests
  accum_metadata_test_grp.addTest(
    `Tests 1st stddev accumulation metadata using the same render settings as ${prev_test_name}.`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, rowid FROM flights WHERE dest_state like 'CA'";
        vega.scales[2].minDensityCnt = "-2ndStdDev";
        vega.scales[2].maxDensityCnt = "2ndStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_04.png");
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(31920.793859225356);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(33457.12301067179);
      }
    )
  );

  // This only renders the LAX flights, so the minDensityCnt & maxDensityCnt should be exactly the same
  accum_metadata_test_grp.addTest(
    `Tests 1st stddev accumulation metadata using a render where all pixel counts are the same.`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, rowid FROM flights WHERE dest_name like 'Los Angeles International'";
        vega.scales[2].minDensityCnt = "-2ndStdDev";
        vega.scales[2].maxDensityCnt = "2ndStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_05.png");

        // min/max density cnts should be exactly the same and should equal the number of LAX-dest flights
        // Should equal: "SELECT count(*) FROM flights WHERE dest_name like 'Los Angeles International'"";
        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(215685);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(215685);
      }
    )
  );

  // now runs tests against all the flights
  // prettier-ignore
  vega = {
    "width": 800,
    "height": 563,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, flights.rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [-19664143.90195494, 16210482.913587093],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [-6461910.016250611, 18784858.60540035],
        "range": "height"
      },
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
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
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "pointmap"},
        "properties": {
          "xc": {"scale": "x", "field": "x"},
          "yc": {"scale": "y", "field": "y"},
          "fillColor": {"scale": "pointmap_fillColor", "value": 0},
          "shape": "circle",
          "width": 8,
          "height": 8
        }
      }
    ]
  };
  accum_metadata_test_grp.addTest(
    `Runs a min/max density accumulation test against all the flights data`,
    new RenderVegaTest(vega, (result) => {
      expect(result).to.matchGoldenImage("accum_metadata_test_06.png");

      expect(result).to.have.vega_metadata.with
        .scale("pointmap_fillColor")
        .with.property("minDensityCnt")
        .to.equal(2);

      expect(result).to.have.vega_metadata.with
        .scale("pointmap_fillColor")
        .with.property("maxDensityCnt")
        .to.equal(509316);
    })
  );

  accum_metadata_test_grp.addTest(
    `Runs a 1st stddev density accumulation test against all the flights data`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[2].minDensityCnt = "-1stStdDev";
        vega.scales[2].maxDensityCnt = "1stStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_07.png");

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(52850.404102322995);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(53557.109251554764);
      }
    )
  );

  accum_metadata_test_grp.addTest(
    `Runs a 2nd stddev density accumulation test against all the flights data`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[2].minDensityCnt = "-2ndStdDev";
        vega.scales[2].maxDensityCnt = "2ndStdDev";
        return vega;
      })(vega),
      (result) => {
        expect(result).to.matchGoldenImage("accum_metadata_test_08.png");

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("minDensityCnt")
          .to.equal(52497.05152770711);

        expect(result).to.have.vega_metadata.with
          .scale("pointmap_fillColor")
          .with.property("maxDensityCnt")
          .to.equal(53910.46182617065);
      }
    )
  );
};
