const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const JsonUtils = require("../../utils/JsonUtils");

module.exports = function(test_collection, expect) {
  const line_accum_test_grp = test_collection.createTestGroup({
    test_description: `Tests accumulation renders with lines`,
    golden_img_dir: `./golden_images`
  });

  // prettier-ignore
  let vega = {
    "width": 1052,
    "height": 1057,
    "data": [
      {
        "name": "pointmap",
        "sql": "SELECT omnisci_geo, rowid FROM north_america_rivers WHERE NOT(ST_XMin(omnisci_geo) > -27.622867061127266 OR ST_XMax(omnisci_geo) < -179.99999999999872 OR ST_YMin(omnisci_geo) > 83.15921305514283 OR ST_YMax(omnisci_geo) < 8.287980554435876)",
        "format": "lines"
      }
    ],
    "projections": [
      {
        "name": "projection",
        "type": "mercator",
        "bounds": {
          "x": [-179.99999999999872,-27.622867061127266],
          "y": [8.287980554435876,83.15921305514283]
        }
      }
    ],
    "scales": [
      {
        "name": "linecolor",
        "type": "linear",
        "domain": [0,1],
        "range": ["blue","red"],
        "accumulator": "density",
        "minDensityCnt": "min",
        "maxDensityCnt": "max"
      }
    ],
    "marks": [
      {
        "type": "lines",
        "from": {"data": "pointmap"},
        "properties": {
          "x": {"field": "x"},
          "y": {"field": "y"},
          "strokeColor": {"scale": "linecolor","value": 0},
          "strokeWidth": 5,
          "lineJoin": "round"
        },
        "transform": {"projection": "projection"}
      }
    ]
  };
  line_accum_test_grp.addTest(
    `Tests a density accumulation render with an north-america-rivers dataset`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchGoldenImage("line_accum_test_01.png")
    )
  );

  line_accum_test_grp.addTest(
    `Tests blend accumulation with the north-america-rivers dataset`,
    new RenderVegaTest(
      ((vega) => {
        vega.data[0].sql =
          "SELECT omnisci_geo, scalerank, rowid FROM north_america_rivers WHERE NOT(ST_XMin(omnisci_geo) > -27.622867061127266 OR ST_XMax(omnisci_geo) < -179.99999999999872 OR ST_YMin(omnisci_geo) > 83.15921305514283 OR ST_YMax(omnisci_geo) < 8.287980554435876)";

        // prettier-ignore
        vega.scales[0] = {
          "name": "linecolor",
          "type": "ordinal",
          "domain": [10,11,12],
          "range": ["blue","green","red"],
          "accumulator": "blend"
        };

        // prettier-ignore
        vega.marks[0].properties.strokeColor = { 
          "scale": "linecolor",
          "field": "scalerank"
        };
        return vega;
      })(vega),
      (result) => expect(result).to.matchGoldenImage("line_accum_test_02.png")
    )
  );

  line_accum_test_grp.addTest(
    `Tests density accumulation with lines build from scalar columns`,
    new RenderVegaTest(
      // prettier-ignore
      {
        "width": 1052,
        "height": 1057,
        "data": [
          {
            "name": "pointmap",
            "sql": "SELECT origin_lon as x1, origin_lat as y1, dest_lon as x2, dest_lat as y2, rowid FROM flights WHERE (((origin_lon >= -126.11384979251031 AND origin_lon <= -66.75320151428946) AND (origin_lat >= 11.908856927823408 AND origin_lat <= 58.0353230071384)) OR ((dest_lon >= -126.11384979251031 AND dest_lon <= -66.75320151428946) AND (dest_lat >= 11.908856927823408 AND dest_lat <= 58.0353230071384))) AND origin_name like 'San Francisco International'",
            "format": {
              "type": "lines",
              "coords": {"x": ["x1","x2"],"y": ["y1","y2"]},
              "layout": "interleaved"
            }
          }
        ],
        "projections": [
          {
            "name": "projection",
            "type": "mercator",
            "bounds": {
              "x": [-126.11384979251031,-66.75320151428946],
              "y": [11.908856927823408,58.0353230071384]
            }
          }
        ],
        "scales": [
          {
            "name": "linecolor",
            "type": "linear",
            "domain": [0.001,0.999],
            "range": ["blue","red"],
            "accumulator": "density",
            "minDensityCnt": "-2ndStdDev",
            "maxDensityCnt": "2ndStdDev"
          }
        ],
        "marks": [
          {
            "type": "lines",
            "from": {"data": "pointmap"},
            "properties": {
              "x": {"field": "x"},
              "y": {"field": "y"},
              "strokeColor": {"scale": "linecolor","value": 0},
              "strokeWidth": 5
            },
            "transform": {"projection": "projection"}
          }
        ]
      },
      (result) => expect(result).to.matchGoldenImage("line_accum_test_03.png")
    )
  );

  line_accum_test_grp.addTest(
    `Tests blend accumulation with lines build from scalar columns`,
    new RenderVegaTest(
      // prettier-ignore
      {
        "width": 1052,
        "height": 1057,
        "data": [
          {
            "name": "pointmap",
            "sql": "SELECT origin_lon as x1, origin_lat as y1, dest_lon as x2, dest_lat as y2, carrier_name, rowid FROM flights WHERE (((origin_lon >= -130.704671914419 AND origin_lon <= -63.48944119720274) AND (origin_lat >= 8.161828727775116 AND origin_lat <= 60.13379788749944)) OR ((dest_lon >= -130.704671914419 AND dest_lon <= -63.48944119720274) AND (dest_lat >= 8.161828727775116 AND dest_lat <= 60.13379788749944))) AND origin_state like 'CA'",
            "format": {
              "type": "lines",
              "coords": {"x": ["x1","x2"],"y": ["y1","y2"]},
              "layout": "interleaved"
            }
          }
        ],
        "projections": [
          {
            "name": "projection",
            "type": "mercator",
            "bounds": {
              "x": [-130.704671914419,-63.48944119720274],
              "y": [8.161828727775116,60.13379788749944]
            }
          }
        ],
        "scales": [
          {
            "name": "linecolor",
            "type": "threshold",
            "domain": [0.25,0.5,0.75],
            "range": ["blue","green","red","orange"],
            "accumulator": "pct",
            "pctCategory": "American Airlines"
          }
        ],
        "marks": [
          {
            "type": "lines",
            "from": {"data": "pointmap"},
            "properties": {
              "x": {"field": "x"},
              "y": {"field": "y"},
              "strokeColor": {"scale": "linecolor","field": "carrier_name"},
              "strokeWidth": 5
            },
            "transform": {"projection": "projection"}
          }
        ]
      },
      (result) => expect(result).to.matchGoldenImage("line_accum_test_04.png")
    )
  );

  line_accum_test_grp.addTest(
    `Tests density accumulation using a much larger dataset (kaggle_taxi_waypoints)`,
    new RenderVegaTest(
      // prettier-ignore
      {
        "width": 1052,
        "height": 1057,
        "data": [
          {
            "name": "pointmap",
            "sql": "SELECT omnisci_geo, rowid FROM kaggle_taxi_waypoints WHERE NOT(ST_XMin(omnisci_geo) > -8.58182575664381 OR ST_XMax(omnisci_geo) < -8.657827016599725 OR ST_YMin(omnisci_geo) > 41.18795342561697 OR ST_YMax(omnisci_geo) < 41.130461364579475)",
            "format": {
              "type": "lines",
              "coords": {"x": ["omnisci_geo"],"y": [{"from": "omnisci_geo"}]},
              "layout": "interleaved"
            }
          }
        ],
        "projections": [
          {
            "name": "projection",
            "type": "mercator",
            "bounds": {
              "x": [-8.657827016599725,-8.58182575664381],
              "y": [41.130461364579475,41.18795342561697]
            }
          }
        ],
        "scales": [
          {
            "name": "linecolor",
            "type": "linear",
            "domain": [0.001,0.999],
            "range": ["blue","red"],
            "accumulator": "density",
            "minDensityCnt": "-2ndStdDev",
            "maxDensityCnt": "2ndStdDev"
          }
        ],
        "marks": [
          {
            "type": "lines",
            "from": {"data": "pointmap"},
            "properties": {
              "x": {"field": "x"},
              "y": {"field": "y"},
              "strokeColor": {"scale": "linecolor","value": 0},
              "strokeWidth": 5,
              "lineJoin": "round"
            },
            "transform": {"projection": "projection"}
          }
        ]
      },
      (result) => expect(result).to.matchGoldenImage("line_accum_test_05.png")
    )
  );
};
