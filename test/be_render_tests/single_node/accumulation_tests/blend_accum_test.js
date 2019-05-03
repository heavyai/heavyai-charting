const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");

module.exports = function(test_collection, expect) {
  const pct_accum_test_grp = test_collection.createTestGroup({
    test_description: `Tests blend accumulation renders`,
    golden_img_dir: `./golden_images`
  });

  // prettier-ignore
  let vega = {
    "width": 746,
    "height": 877,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT lon as x, lat as y, recipient_party as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)"
      }
    ],
    "scales": [
      {
        "name": "accum_fillColor",
        "type": "ordinal",
        "domain": ["D", "R"],
        "range": ["blue", "red"],
        "default": "gray",
        "accumulator": "blend"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-74.25573489999996, -73.70027209999992],
          "y": [40.45800971823104, 40.953029519318505]
        }
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "size": 5,
          "fillColor": {
            "scale": "accum_fillColor",
            "field": "color"
          }
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  };
  const orig_test = new RenderVegaTest(vega, (result) =>
    expect(result).to.matchGoldenImage("blend_accum_test_01.png")
  );
  let prev_test_name = pct_accum_test_grp.addTest(
    `Tests blend accumulation against the contributions data`,
    orig_test
  );

  pct_accum_test_grp.addTest(
    `Tests that adding additional blend colors works appropriately.`,
    new RenderVegaTest(
      ((vega) => {
        const new_vega = JsonUtils.jsonCopy(vega);
        new_vega.scales[0].domain = [ "D", "R", "I", "L", "U" ];
        new_vega.scales[0].range = [ "blue", "red", "green", "yellow", "magenta" ];
        return new_vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_02.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests that returning back to the original number of blend colors works appropriately. Should be the same as ${prev_test_name}`,
    orig_test
  );

  pct_accum_test_grp.addTest(
    `Tests that adding null to the blend ordinal scale works appropriately`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].domain = [ "D" ];
        vega.scales[0].range = [ "blue" ];
        vega.scales[0].nullValue = "orange";
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_03.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests that adding an invalid dict-enc str value to the scale domain still works. It should be ignored (and you should see an warning in the log indicating that).`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].domain.push("fubar");
        vega.scales[0].range.push("black");
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_03.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests adding a CASE statement to the sql to build a domain for the blend accum scale.`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT lon as x, lat as y, CASE recipient_party WHEN 'R' THEN 1 WHEN 'D' THEN 1 ELSE 0 END as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)";
        vega.scales[0].domain = [ 0, 1 ];
        vega.scales[0].range = [ "blue", "red" ];
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_04.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests that linear scales don't work with blend accumulation`,
    new RenderVegaTest(
      ((vega) => {
        // prettier-ignore
        vega.scales[0] = {
          "name": vega.scales[0].name,
          "type": "linear",
          "domain": [0, 1],
          "range": ["blue", "red"],
          "accumulator": "blend"
        }
        return vega;
      })(vega),
      (result) => expect(result).to.be.a.vegaParseError("/scales/0")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests a quantize scale with blend accumulation`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT lon as x, lat as y, amount as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)";
        // prettier-ignore
        vega.scales[0] = {
          "name": vega.scales[0].name,
          "type": "quantize",
          "domain": [5000, 50000],
          "range": ["blue", "orange", "red"],
          "accumulator": "blend"
        }
        vega.marks[0].properties.size = 10;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_05.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests a threshold scale with blend accumulation`,
    new RenderVegaTest(
      ((vega) => {
        // prettier-ignore
        vega.scales[0] = {
          "name": vega.scales[0].name,
          "type": "quantize",
          "domain": [500, 5000],
          "range": ["blue", "orange", "red"],
          "accumulator": "blend"
        }
        vega.marks[0].properties.size = 10;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("blend_accum_test_06.png")
    )
  );
};
