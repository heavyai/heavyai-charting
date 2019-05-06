const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");
const ImageUtils = require("../../utils/ImageUtils");
const PolyUtils = require("../../utils/PolyUtils");

module.exports = function(test_collection, expect, is_distributed) {
  const zipcode_test_grp = test_collection.createTestGroup({
    test_description: `Tests a handful of vega renders against a zipcode poly table`,
    golden_img_dir: `./golden_images`
  });

  const legacy_test_grp = zipcode_test_grp.createTestSubGroup("legacy_zipcode_test", {
    test_description: "Tests rendering legacy poly queries."
  });

  const latest_test_grp = zipcode_test_grp.createTestSubGroup("latest_zipcode_test", {
    test_description: "Tests rendering legacy poly queries."
  });

  function build_tests(test_grp, use_latest_query) {
    // prettier-ignore
    let vega = {
    "width": 793,
    "height": 1060,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": `SELECT ${use_latest_query ? "omnisci_geo, " : ""}rowid from zipcodes_2017`
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -113.154, -81.846 ],
          "y": [ 22.0, 54.0 ]
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
          "fillColor": "red"
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

    test_grp.addTest(
      "Should render all zipcode polygons red using mercator projection",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_01.png");
        }
      })
    );

    const stroke_vega = JsonUtils.jsonCopy(vega);
    stroke_vega.marks[0].properties.strokeColor = "blue";
    stroke_vega.marks[0].properties.strokeWidth = 1;
    const red_poly_blue_stroke_test = new RenderVegaTest(stroke_vega, (result) => {
      if (!use_latest_query && is_distributed) {
        expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
      } else {
        expect(result).to.matchGoldenImage(
          is_distributed
            ? "zipcode_test_distributed_02.png"
            : use_latest_query ? "zipcode_test_02b.png" : "zipcode_test_02.png"
        );
      }
    });
    test_grp.addTest(
      "Should render all zipcode polygons red with a blue stroke of width 1px",
      red_poly_blue_stroke_test
    );

    test_grp.addTest(
      "Should properly update state and re-render all zipcode polygons red",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_01.png");
        }
      })
    );

    const new_stroke_vega = JsonUtils.jsonCopy(vega);
    const mark = new_stroke_vega.marks[0];
    mark.properties.strokeColor = "blue";
    mark.properties.strokeWidth = 1;
    mark.properties.fillColor = "rgba(0,0,0,0)";
    test_grp.addTest(
      "Should render all zipcode polygons with a blue stroke of width 1px and a fully transparent fill color",
      new RenderVegaTest(new_stroke_vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_03.png");
        }
      })
    );

    test_grp.addTest(
      "Should properly update state and re-render zipcode polygons red with a blue stroke of width 1px",
      red_poly_blue_stroke_test
    );

    test_grp.addTest(
      "Should properly update state and re-render zipcode polygons with a blue stroke of width 1px and a fully transparent fill color",
      new RenderVegaTest(new_stroke_vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_03.png");
        }
      })
    );

    // prettier-ignore
    vega = {
    "width": 733,
    "height": 530,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": `SELECT ${use_latest_query ? "omnisci_geo, " : ""} rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE '55___'`
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -124.39, -66.94 ],
          "y": [ 20.6157, 52.9312 ]
        }
      }
    ],
    "scales": [
      {
        "name": "polys_fillColor",
        "type": "ordinal",
        "domain": [ "89049" ],
        "range": [ "red" ],
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
  };
    test_grp.addTest(
      'Should render only the zipcodes starting with "55" with a blue fill color',
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_04.png");
        }
      })
    );

    // prettier-ignore
    vega = {
    "width": 733,
    "height": 530,
    "data": [
      {
        "name": "polys",
        "format": "polys",
        "sql": `SELECT ${use_latest_query ? "omnisci_geo, " : ""} rowid, ZCTA5CE10 as color from zipcodes_2017 WHERE ZCTA5CE10 LIKE 'ab___'`
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -124.39, -66.94 ],
          "y": [ 20.6157, 52.9312 ]
        }
      }
    ],
    "scales": [
      {
        "name": "polys_fillColor",
        "type": "ordinal",
        "domain": [ "89049" ],
        "range": [ "red" ],
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
  };
    test_grp.addTest(
      `Should render an empty ${vega.width}x${vega.height} image as the query should result in 0 rows`,
      (() => {
        const width = vega.width,
          height = vega.height;
        return new RenderVegaTest(vega, (result) => {
          if (!use_latest_query && is_distributed) {
            expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
          } else {
            expect(result).to.matchImage(ImageUtils.emptyPng(width, height));
          }
        });
      })()
    );

    // prettier-ignore
    vega = {
    "width": 793,
    "height": 1060,
    "data": [
      {
        "name": "table",
        "sql": `SELECT ${use_latest_query ? "omnisci_geo, " : ""} ALAND10, rowid FROM zipcodes_2017`,
        "format": "polys"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -113.154, -81.846 ],
          "y": [ 22.0, 54.0 ]
        }
      }
    ],
    "scales": [
      {
        "name": "color",
        "type": "linear",
        "domain": [ 1, 880000000 ],
        "range": [ "blue", "red" ],
        "clamp": true
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": { "data": "table" },
        "properties": {
          "x": { "field": "x" },
          "y": { "field": "y" },
          "fillColor": { "scale": "color", "field": "ALAND10" }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

    test_grp.addTest(
      "Uses a linear scale to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_05.png");
        }
      })
    );

    vega.scales[0].type = "sqrt";
    test_grp.addTest(
      "Uses a sqrt scale to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_06.png");
        }
      })
    );

    vega.scales[0].type = "log";
    test_grp.addTest(
      "Uses a log scale to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_07.png");
        }
      })
    );

    vega.scales[0].type = "pow";
    vega.scales[0].exponent = 1;
    test_grp.addTest(
      "Uses a pow scale with an exponent of 1 to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_08.png");
        }
      })
    );

    vega.scales[0].exponent = 2;
    test_grp.addTest(
      "Uses a pow scale with an exponent of 2 to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_09.png");
        }
      })
    );

    vega.scales[0].exponent = 0.25;
    test_grp.addTest(
      "Uses a pow scale with an exponent of 0.25 to color zipcodes according to land area",
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("zipcode_test_10.png");
        }
      })
    );
  }

  build_tests(legacy_test_grp, false);
  build_tests(latest_test_grp, true);
};
