const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const ImageUtils = require("../../utils/ImageUtils");

module.exports = function(test_collection, expect) {
  const line_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests various line renders that build the lines from LINESTRING geo columns`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(line_test_grp);

  // prettier-ignore
  let vega = {
    "width": 1089,
    "height": 1033,
    "data": [
      {
        "name": "linemap",
        "format": {
          "type": "lines",
          "coords": { "x": [ "points" ], "y": [ { "from": "points" } ] },
          "layout": "interleaved"
        },
        "sql": "SELECT rowid, omnisci_geo as points FROM north_america_rivers WHERE (ST_XMax(omnisci_geo) >= -179.99999999999886 AND ST_XMin(omnisci_geo) <= -27.743704049260515 AND ST_YMax(omnisci_geo) >= 9.429808031730957 AND ST_YMin(omnisci_geo) <= 82.20270263522823)"
      }
    ],
    "scales": [],
    "projections": [
      {
        "name": "mercator_map_projection",
        "type": "mercator",
        "bounds": {
          "x": [ -179.99999999999886, -27.743704049260515 ],
          "y": [ 9.429808031730957, 82.20270263522823 ]
        }
      }
    ],
    "marks": [
      {
        "type": "lines",
        "from": { "data": "linemap" },
        "properties": {
          "x": { "field": "x" },
          "y": { "field": "y" },
          "strokeColor": "red",
          "strokeWidth": 2
        },
        "transform": { "projection": "mercator_map_projection" }
      }
    ]
  };

  const orig_line_test = new RenderVegaTest(vega, (result) =>
    expect(result).to.matchGoldenImage("geo_linestring_test_01.png")
  );
  const orig_line_test_name = line_test_grp.addTest(
    `Tests that rendering a LINESTRING geo column from a north_americas_rivers table works using an explicit legacy line format structure`,
    orig_line_test
  );

  vega.data[0].format = "lines";
  line_test_grp.addTest(
    `Tests rendering a LINESTRING geo column using the shortened format structure. It should render exactly the same as ${orig_line_test_name}`,
    orig_line_test
  );

  const empty_bounds = [
    -41.90191097667707, // min lon
    -28.781573809489174, // max lon
    22.44466727251495, // min lat
    33.41441141096661 // max lat
  ];
  vega.data[0].sql = `SELECT rowid, omnisci_geo FROM north_america_rivers WHERE (ST_XMax(omnisci_geo) >= ${empty_bounds[0]} AND ST_XMin(omnisci_geo) <= ${empty_bounds[1]} AND ST_YMax(omnisci_geo) >= ${empty_bounds[2]} AND ST_YMin(omnisci_geo) <= ${empty_bounds[3]})`;
  vega.projections[0].bounds.x = [ empty_bounds[0], empty_bounds[1] ];
  vega.projections[0].bounds.y = [ empty_bounds[2], empty_bounds[3] ];
  line_test_grp.addTest(
    `Checks that a line render query that results in an empty result set runs without error`,
    new RenderVegaTest(vega, (result) =>
      expect(result).to.matchImage(ImageUtils.emptyPng(vega.width, vega.height))
    )
  );
};
