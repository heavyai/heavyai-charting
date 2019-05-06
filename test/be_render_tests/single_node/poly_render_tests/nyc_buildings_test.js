const RenderVegaTest = require("../../lib/RenderVegaTest");
const PolyUtils = require("../../utils/PolyUtils");

module.exports = function(test_collection, expect, is_distributed) {
  let test_grp = test_collection.createTestGroup({
    test_description: `Tests a handful of vega renders against a large nyc_buildings poly table`,
    golden_img_dir: `./golden_images`,
    before: {
      description: "Clearing out gpu memory before renders of larger nyc_buildings table.",
      callback: (test_state) => test_state.server_connection.clearGpuMemoryAsync()
    }
  });

  const legacy_test_grp = test_grp.createTestSubGroup("legacy_nyc_buildings_test", {
    test_description: "Tests rendering legacy poly queries."
  });

  const latest_test_grp = test_grp.createTestSubGroup("latest_nyc_buildings_test", {
    test_description: "Tests rendering latest poly queries."
  });

  function build_tests(test_grp, use_latest_query) {
    // prettier-ignore
    const vega = {
    "width": 1280,
    "height": 840,
    "data": [
      {
        "name": "backendChoropleth",
        "format": "polys",
        "sql": `SELECT rowid, bbl as key0, ${use_latest_query ? "SAMPLE(omnisci_geo) as omnisci_geo, " : ""} avg(heightroof) as color FROM nyc_buildings GROUP BY rowid, key0`
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -74.02, -73.9488 ],
          "y": [ 40.7043, 40.73992 ]
        }
      }
    ],
    "scales": [
      {
        "name": "backendChoropleth_fillColor",
        "type": "quantize",
        "domain": [ 0, 500 ],
        "range": [
          "rgba(17,95,154,0.85)",
          "rgba(25,132,197,0.85)",
          "rgba(34,167,240,0.85)",
          "rgba(72,181,196,0.85)",
          "rgba(118,198,143,0.85)",
          "rgba(166,215,91,0.85)",
          "rgba(201,229,47,0.85)",
          "rgba(208,238,17,0.85)",
          "rgba(208,244,0,0.85)"
        ],
        "nullValue": "#D6D7D6",
        "default": "#D6D7D6"
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": {
          "data": "backendChoropleth"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "backendChoropleth_fillColor",
            "field": "color"
          },
          "strokeColor": "white",
          "strokeWidth": 0.5,
          "lineJoin": "miter",
          "miterLimit": 10
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };

    let prev_test = test_grp.addTest(
      `Should render nyc_buildings grouped by a building id column (bbl) and colored by avg(heightroof).`,
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("nyc_buildings_test_01.png");
        }
      }),
      {
        pending: use_latest_query ? `Pending https://jira.omnisci.com/browse/BE-2903` : false
      }
    );

    vega.projections[0].bounds.x = [ -74.0363173040059, -73.93220681064426 ];
    vega.projections[0].bounds.y = [ 40.70051339409347, 40.75229049587891 ];
    prev_test = test_grp.addTest(
      `Should render almost the exact same thing as test ${prev_test} but slightly zooomed in.`,
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("nyc_buildings_test_02.png");
        }
      }),
      {
        pending: use_latest_query ? `Pending https://jira.omnisci.com/browse/BE-2903` : false
      }
    );

    vega.data[0].sql = `SELECT rowid, bbl as key0, ${use_latest_query
      ? "SAMPLE(omnisci_geo) as omnisci_geo, "
      : ""} avg(cnstrct_yr) as color FROM nyc_buildings GROUP BY rowid, key0`;
    vega.scales[0].domain = [ 0, 675714015.3333334 ];
    test_grp.addTest(
      `Should render almost the exact same thing as test ${prev_test} but colors by avg(cnstrct_yr).`,
      new RenderVegaTest(vega, (result) => {
        if (!use_latest_query && is_distributed) {
          expect(result).to.be.a.TMapDException(PolyUtils.legacy_poly_err_regex);
        } else {
          expect(result).to.matchGoldenImage("nyc_buildings_test_03.png");
        }
      }),
      {
        pending: use_latest_query ? `Pending https://jira.omnisci.com/browse/BE-2903` : false
      }
    );
  }

  build_tests(legacy_test_grp, false);
  build_tests(latest_test_grp, true);
};
