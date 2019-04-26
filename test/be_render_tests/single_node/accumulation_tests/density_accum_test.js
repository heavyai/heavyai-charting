const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");

module.exports = function(test_collection, expect) {
  const density_accum_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests density accumulation renders`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(density_accum_test_grp);

  // prettier-ignore
  let vega = {
    "width": 1089,
    "height": 1114,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, lat as y FROM tweets_nov_feb WHERE ((lon >= -107.80383372030019 AND lon <= -107.78088775831222) AND (lat >= 39.53273697812037 AND lat <= 39.55083821842854))"
      }
    ],
    "scales": [
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [0,1],
        "range": ["blue","red"],
        "accumulator": "density",
        "minDensityCnt": 1,
        "maxDensityCnt": 2,
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-107.80383372030019,-107.78088775831222],
          "y": [39.53273697812037,39.55083821842854]
        }
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "pointmap"},
        "properties": {
          "xc": {"field": "x"},
          "yc": {"field": "y"},
          "fillColor": {"scale": "pointmap_fillColor","value": 0},
          "shape": "circle",
          "width": 100,
          "height": 100
        },
        "transform": {"projection": "merc"}
      }
    ]
  };
  let prev_test_name = density_accum_test_grp.addTest(
    `Tests explicitly-defined minDensityCnt/maxDensityCnt on a controlled tweet render (only 3 results)`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("density_accum_test_01.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests adding more overlap to the 3 points from ${prev_test_name}. The max density cnt should be three, but all areas with 2-3 overlaps should be red. The rest blue.`,
    new RenderVegaTest(
      ((vega) => {
        vega.marks[0].properties.width = 120;
        vega.marks[0].properties.height = 120;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_02.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests increasing the maxDensityCnt to account for the 3 overlaps from ${prev_test_name}. The area where there is 3 overlaps should be red, where there are 2 overlaps should be purple, and 1 overlap blue.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].maxDensityCnt = 3;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_03.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests increasing the minDensityCnt to 2 from ${prev_test_name}. The area where there is 3 overlaps should be red, where there are 1-2 overlaps should be blue.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].minDensityCnt = 2;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_04.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests increasing the maxDensityCnt to 10 from ${prev_test_name}.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].minDensityCnt = 1;
        vega.scales[0].maxDensityCnt = 10;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_05.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests adding additional color to control mid-density percentages.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].domain = [ 0, 0.5, 1 ];
        vega.scales[0].range = [ "blue", "green", "red" ];
        vega.scales[0].minDensityCnt = 1;
        vega.scales[0].maxDensityCnt = 3;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_06.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests using the min/max keyword for min/max density cnts.`,
    new RenderVegaTest(
      ((vega) => {
        vega.scales[0].minDensityCnt = "min";
        vega.scales[0].maxDensityCnt = "max";
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_06.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests downsizes the points from ${prev_test_name} so that there is only 2 overlapping pts.`,
    new RenderVegaTest(
      ((vega) => {
        vega.marks[0].properties.width = 40;
        vega.marks[0].properties.height = 40;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_07.png")
    )
  );

  prev_test_name = density_accum_test_grp.addTest(
    `Tests downsizes the points further from ${prev_test_name} so that there should be no overlapping points.`,
    new RenderVegaTest(
      ((vega) => {
        vega.marks[0].properties.width = 20;
        vega.marks[0].properties.height = 20;
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("density_accum_test_08.png")
    )
  );

  // prettier-ignore
  vega = {
    "width": 1089,
    "height": 1065,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT lon as x, lat as y FROM tweets_nov_feb_60M WHERE ((lon >= -74.12927299121388 AND lon <= -73.82168207903752) AND (lat >= 40.61464841747187 AND lat <= 40.84260595026319))"
      }
    ],
    "scales": [
      {
        "name": "pointmap_fillColor",
        "type": "linear",
        "domain": [0,1],
        "range": ["blue","red"],
        "accumulator": "density",
        "minDensityCnt": "min",
        "maxDensityCnt": "max",
        "clamp": true
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [-74.12927299121388,-73.82168207903752],
          "y": [40.61464841747187,40.84260595026319]
        }
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {"data": "pointmap"},
        "properties": {
          "xc": {"field": "x"},
          "yc": {"field": "y"},
          "fillColor": {"scale": "pointmap_fillColor","value": 0},
          "shape": "circle",
          "width": 8,
          "height": 8
        },
        "transform": {"projection": "merc"}
      }
    ]
  };

  prev_test_name = density_accum_test_grp.addTest(
    `Tests renders against the tweets_nov_feb_60M table.`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("density_accum_test_09.png")
    )
  );

  const minmax_test = new RenderVegaTest(
    ((vega) => {
      vega.scales[0].domain = [ 0, 0.25, 0.5, 0.75, 1 ];
      vega.scales[0].range = [ "blue", "green", "yellow", "orange", "red" ];
      return vega;
    })(vega),
    (result) => expect(result).to.matchGoldenImage("density_accum_test_10.png")
  );
  prev_test_name = density_accum_test_grp.addTest(
    `Adds intermediate percentages to the density accumulation from ${prev_test_name}.`,
    minmax_test
  );

  const firststddev_test = new RenderVegaTest(
    ((vega) => {
      vega.scales[0].minDensityCnt = "-1stStdDev";
      vega.scales[0].maxDensityCnt = "1stStdDev";
      return vega;
    })(vega),
    (result) => expect(result).to.matchGoldenImage("density_accum_test_11.png")
  );
  prev_test_name = density_accum_test_grp.addTest(
    `Tests 1st stddev density renders using the same query from ${prev_test_name}.`,
    firststddev_test
  );
  const secondstddev_test = new RenderVegaTest(
    ((vega) => {
      vega.scales[0].minDensityCnt = "-2ndStdDev";
      vega.scales[0].maxDensityCnt = "2ndStdDev";
      return vega;
    })(vega),
    (result) => expect(result).to.matchGoldenImage("density_accum_test_12.png")
  );
  prev_test_name = density_accum_test_grp.addTest(
    `Tests 2nd stddev density renders using the same query from ${prev_test_name}.`,
    secondstddev_test
  );

  density_accum_test_grp.addTest(
    `Tests switching between the various auto min/max density count types work appropriately`,
    [
      firststddev_test,
      minmax_test,
      secondstddev_test,
      minmax_test,
      secondstddev_test,
      firststddev_test
    ]
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
        "accumulator": "density",
        "minDensityCnt": 0,
        "maxDensityCnt": 1000
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
          "fillColor": {
            "scale": "party_color",
            "field": "color"
          }
        }
      }
    ]
  }

  density_accum_test_grp.addTest(
    `Tests some additional density renders against the contributions dataset`,
    [
      new RenderVegaTest(vega, (result) =>
        expect(result).to.matchGoldenImage("density_accum_test_13.png")
      ),
      new RenderVegaTest(
        ((vega) => {
          vega.scales[2].maxDensityCnt = 100000;
          return vega;
        })(vega),
        (result) => expect(result).to.matchGoldenImage("density_accum_test_14.png")
      ),
      new RenderVegaTest(
        ((vega) => {
          vega.scales[2].maxDensityCnt = 10000;
          return vega;
        })(vega),
        (result) => expect(result).to.matchGoldenImage("density_accum_test_15.png")
      )
    ]
  );
};
