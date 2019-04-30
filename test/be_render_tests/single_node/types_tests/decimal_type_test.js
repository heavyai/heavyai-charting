const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");

module.exports = function(test_collection, expect) {
  const decimal_type_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests pct accumulation renders`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(decimal_type_test_grp);

  // prettier-ignore
  const vega1 = {
    "width": 1359,
    "height": 895,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(Lon) as x, conv_4326_900913_y(Lat) as y, Speed as color, TrackAngle as size, airplanes_20161214.rowid FROM airplanes_20161214 WHERE MOD(airplanes_20161214.rowid * 265445761, 4294967296) < 292525826 AND ((Lon >= -124.38999999999945 AND Lon <= -66.9400000000007) AND (Lat >= 22.33928769805452 AND Lat <= 51.800212016720224))"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -13847031.45787536, -7451726.712679397 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 2552309.8200721354, 6764081.524974389 ],
        "range": "height"
      },
      {
        "name": "pointmap_size",
        "type": "quantize",
        "domain": [0, 359.9],
        "range": [ 1, 2, 4, 8, 14, 20 ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "pointmap"
        },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "fillColor": "blue",
          "shape": "circle",
          "width": { "scale": "pointmap_size", "field": "size" },
          "height": { "scale": "pointmap_size", "field": "size" },
        }
      }
    ]
  }
  // with the airplanes_20161214 table, the TrackAngle column is a DECIMAL(12,3) column
  decimal_type_test_grp.addTest(
    `Tests that a DECIMAL(12,3) column works in a quantize scale.`,
    new RenderVegaTest(vega1, (result) => expect(result).to.matchGoldenImage("decimal_type_test_01.png"))
  );

  // prettier-ignore
  const vega2 = {
      "width": 295,
      "height": 607,
      "data": [
        {
          "name": "points",
          "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199)"
        }
      ],
      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": [ -367.239050286676, 336.23512241134455 ],
          "range": "width"
        },
        {
          "name": "y",
          "type": "linear",
          "domain": [ -159.0039062616728, 1157.8997450290199 ],
          "range": "height"
        },
        {
          "name": "points_size",
          "type": "quantize",
          "domain": [-222.53715088908888, 222.21931468945832],
          "range": [ 2, 4, 6, 8, 10, 12 ]
        }
      ],
      "marks": [
        {
          "type": "symbol",
          "from": {
            "data": "points"
          },
          "properties": {
            "xc": { "scale": "x", "field": "x" },
            "yc": { "scale": "y", "field": "y" },
            "fillColor": "red",
            "width": { "scale": "points_size", "field": "x" },
            "height": { "scale": "points_size", "field": "x" }
          }
        }
      ]
    }
  // with the nba table, the original_x/y are DECIMAL(14,7)
  decimal_type_test_grp.addTest(
    `Tests that a DECIMAL(14,7) column works in a linear scale.`,
    new RenderVegaTest(vega2, (result) => expect(result).to.matchGoldenImage("decimal_type_test_02.png"))
  );

  // prettier-ignore
  const vega3 = {
    "width": 295,
    "height": 607,
    "data": [
      {
        "name": "points",
        "sql": "SELECT original_x as x, original_y as y, nba.rowid FROM nba WHERE (original_x >= -367.239050286676 AND original_x <= 336.23512241134455) AND (original_y >= -159.0039062616728 AND original_y <= 1157.8997450290199)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -367.239050286676, 336.23512241134455 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ -159.0039062616728, 1157.8997450290199 ],
        "range": "height"
      },
      {
        "name": "points_size",
        "type": "threshold",
        "domain": [ -114, -17, 0, 20, 110 ],
        "range": [ 1, 3, 6, 12, 16, 20 ]
      }
    ],
    "marks": [
      {
        "type": "points",
        "from": {
          "data": "points"
        },
        "properties": {
          "x": { "scale": "x", "field": "x" },
          "y": { "scale": "y", "field": "y" },
          "fillColor": "green",
          "size": { "scale": "points_size", "field": "x" }
        }
      }
    ]
  };
  // with the nba table, the original_x/y are DECIMAL(14,7)
  decimal_type_test_grp.addTest(
    `Tests that a DECIMAL(14,7) column works in a threshold scale with a point mark.`,
    new RenderVegaTest(vega3, (result) => expect(result).to.matchGoldenImage("decimal_type_test_03.png"))
  );
};
