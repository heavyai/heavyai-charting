const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");

module.exports = function(test_collection, expect, is_distributed) {
  const pct_accum_test_grp = test_collection.createTestGroup({
    test_description: `Tests pct accumulation renders`,
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
        "type": "threshold",
        "domain": [0.25, 0.5, 0.75],
        "range": ["blue", "cyan", "yellow", "red"],
        "accumulator": "pct",
        "pctCategory": "R"
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
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "square",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 5,
          "height": 5,
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
  let prev_test_name = pct_accum_test_grp.addTest(
    `Tests pct accumulation against the contributions data`,
    new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage("pct_accum_test_01.png"))
  );

  pct_accum_test_grp.addTest(
    `Tests updating the 'pctCategory' property but otherwise should be the same vega as ${prev_test_name}`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].pctCategory = "D";
        vega.scales[0].range = [ "red", "yellow", "cyan", "blue" ];
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("pct_accum_test_02.png")
    )
  );

  pct_accum_test_grp.addTest(
    `Tests an invalid dict-enc string value used for the 'pctCategory' property.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].pctCategory = "fubar";
        return vega;
      })(vega),
      (result) => expect(result).to.be.a.TMapDException
    )
  );

  pct_accum_test_grp.addTest(
    `Tests using a case statement in the sql to generate a binary result to drive a pct accumulation`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT lon as x, lat as y, CASE recipient_party WHEN 'R' THEN 1 WHEN 'D' THEN 1 ELSE 0 END as color, rowid FROM contributions WHERE (lon >= -74.25573489999996 AND lon <= -73.70027209999992) AND (lat >= 40.45800971823104 AND lat <= 40.953029519318505) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)";
        vega.scales[0].range = [ "blue", "cyan", "yellow", "red" ];
        vega.scales[0].pctCategory = 1;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("pct_accum_test_03.png")
    )
  );

  // prettier-ignore
  vega = {
    "width": 714,
    "height": 535,
    "data": [
      {
        "name": "table",
        "sql": "SELECT lon as x, lat as y, amount, rowid FROM contributions WHERE (lon between -74.33290956325027 and -73.59158783530206) AND (lat between 40.5501992833373 and 40.97093630948216)"
      }
    ],
    "scales": [
      {
        "name": "pointcolor",
        "type": "threshold",
        "domain": [
          0.33,
          0.66
        ],
        "range": [
          "blue",
          "purple",
          "red"
        ],
        "accumulator": "pct",
        "pctCategory": 1000 
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-74.33290956325027, -73.59158783530206],
          "y": [40.5501992833373, 40.97093630948216]
        }
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "table"
        },
        "properties": {
          "x": {
            "field": "x"
          },
          "y": {
            "field": "y"
          },
          "fillColor": {
            "scale": "pointcolor",
            "field": "amount"
          },
          "size": 10 
        },
        "transform": {
          "projection": "merc"
        }
      }
    ]
  }
  pct_accum_test_grp.addTest(
    `Tests using numerical values for 'pctCategory'`,
    new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage("pct_accum_test_04.png"))
  );

  pct_accum_test_grp.addTest(
    `Tests using 'pctCategoryMargin' property to build a range for a numerical category. The range will equal to 0-2000 for amount.`,
    new RenderVegaTest(
      ((vega) => {
        // with pctCategory = 1000, and a margin of 1000, makes the categorical range from 0-2000
        vega.scales[0].pctCategoryMargin = 1000;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("pct_accum_test_05.png")
    )
  );

  // prettier-ignore
  vega = {
    "width": 399,
    "height": 535,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT conv_4326_900913_x(lon) as x, conv_4326_900913_y(lat) as y, recipient_party as color, rowid FROM contributions WHERE (conv_4326_900913_x(lon) >= -12014254.628965287 AND conv_4326_900913_x(lon) <= -9693046.072701354) AND (conv_4326_900913_y(lat) >= 3280722.526925205 AND conv_4326_900913_y(lat) <= 6393119.964520493) AND (lon IS NOT NULL AND lat IS NOT NULL AND amount > 0)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -12014254.628965287,
          -9693046.072701354
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          3280722.526925205,
          6393119.964520493
        ],
        "range": "height"
      },
      {
        "name": "party_color",
        "type": "threshold",
        "domain": [
          0.25,
          0.5,
          0.75
        ],
        "range": [
          "blue",
          "green",
          "red",
          "orange"
        ],
        "accumulator": "pct",
        "pctCategory": "R"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "circle",
          "xc": {
            "scale": "x",
            "field": "x"
          },
          "yc": {
            "scale": "y",
            "field": "y"
          },
          "width": 5,
          "height": 5,
          "fillColor": "red"
        }
      }
    ]
  }

  pct_accum_test_grp.addTest(
    `Tests updating from a flat render to using pct accumulation`,
    [
      new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage("pct_accum_test_06.png")),
      new RenderVegaTest(
        ((vega) => {
          // prettier-ignore
          vega.marks[0].properties.fillColor = {
            "scale": "party_color",
            "field": "color"
          };
          return vega;
        })(vega),
        (result) => expect(result).to.matchGoldenImage("pct_accum_test_07.png")
      )
    ],
    {
      pending: is_distributed ? "Pending https://jira.omnisci.com/browse/BE-3509" : false
    }
  );
};
