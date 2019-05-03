const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");

module.exports = function(test_collection, expect) {
  const decimal_type_test_grp = test_collection.createTestGroup({
    test_description: `Tests pct accumulation renders`,
    golden_img_dir: `./golden_images`
  });

  // prettier-ignore
  const vega1 = {
    "width": 1334,
    "height": 894,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT conv_4326_900913_x(Lon) as x, conv_4326_900913_y(Lat) as y, Speed as color, TrackAngle as size, rowid FROM airplanes_20161214 WHERE (Lon >= -0.7532478324294232 AND Lon <= 33.75388153497627) AND (Lat >= 49.518975394967526 AND Lat <= 62.3295016748269)"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [ -83851.16513550827, 3757464.904246995 ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [ 6363383.873211006, 8937699.140096156 ],
        "range": "height"
      },
      {
        "name": "pointmap_size",
        "type": "quantize",
        "domain": [ 0, 359.9 ],
        "range": [ 1, 2, 4, 8, 14, 20 ]
      }
    ],
    "projections": [],
    "marks": [
      {
        "type": "symbol",
        "from": { "data": "pointmap" },
        "properties": {
          "xc": { "scale": "x", "field": "x" },
          "yc": { "scale": "y", "field": "y" },
          "fillColor": "blue",
          "shape": "circle",
          "width": { "scale": "pointmap_size", "field": "size" },
          "height": { "scale": "pointmap_size", "field": "size" }
        }
      }
    ]
  };

  // with the airplanes_20161214 table, the TrackAngle column is a DECIMAL(12,3) column
  decimal_type_test_grp.addTest(
    `Tests that a DECIMAL(12,3) column works in a quantize scale.`,
    new RenderVegaTest(vega1, (result) =>
      expect(result).to.matchGoldenImage("decimal_type_test_01.png")
    )
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
    new RenderVegaTest(vega2, (result) =>
      expect(result).to.matchGoldenImage("decimal_type_test_02.png")
    )
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
    new RenderVegaTest(vega3, (result) =>
      expect(result).to.matchGoldenImage("decimal_type_test_03.png")
    )
  );
};
