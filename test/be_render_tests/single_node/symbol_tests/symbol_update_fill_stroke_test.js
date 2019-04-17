const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');

module.exports = function(test_collection, expect) {
  const symbol_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests vega updates to the fill/stroke color of the 'symbol' mark type. These tests are meant to validate that any changes to these properties between successive renders work appropriately.`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(symbol_test_grp);

  const vega = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as y, count(*) as color FROM contributions WHERE ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [
          1,
          100000
        ],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.946666666666667,
          "height": 11.485421355078957,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const first_test = new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage('symbol_update_fill_stroke_test_01.png'));
  const first_test_name = symbol_test_grp.addTest(
    'Should render a horizontal hexagonal-binned heatmap of the US with a fillColor driven by # of contributions per bin',
    first_test
  );

  vega.marks[0].properties.strokeColor = "black";
  vega.marks[0].properties.strokeWidth = 1;
  const second_test = new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage('symbol_update_fill_stroke_test_02.png'));
  const second_test_name = symbol_test_grp.addTest(
    `Enables stroke rendering on the symbol. Should render the same horizontal hex-binned heatmap as ${first_test_name} with a black stroke of width 1 applied`,
    second_test
  );

  symbol_test_grp.addTest(
    `Disables stroking on the symbol. Should render the same horizontal hex-binned heatmap as ${first_test_name}.`,
    first_test
  );

  vega.marks[0].properties.strokeColor = "black";
  vega.marks[0].properties.strokeWidth = 1;
  const prev_color_prop = vega.marks[0].properties.fillColor;
  vega.marks[0].properties.fillColor = 'rgba(0,0,0,0)';
  const prev_color_scale = vega.scales.pop();
  const black_stroke_only_test = 
    new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage('symbol_update_fill_stroke_test_03.png'))
  const black_stroke_only_test_name = symbol_test_grp.addTest(
    `Enables stroking and disables fill on the symbol. Should render the same horizontal hex-binned heatmap as ${first_test_name} but with only stroking applied.`,
    black_stroke_only_test
  );

  vega.scales.push(prev_color_scale);
  vega.marks[0].properties.strokeColor = prev_color_prop;
  symbol_test_grp.addTest(
    `Now colors the strokes using the color scale applied the fillColor in ${first_test_name}`,
    new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage('symbol_update_fill_stroke_test_04.png'))
  );

  symbol_test_grp.addTest(
    `Enables fill on the symbol and returns the color scale to the fillColor. Should render the same image as ${second_test_name}`,
    second_test
  );

  symbol_test_grp.addTest(
    `Enables stroke and disables fill on the symbol. Should render the same image as ${black_stroke_only_test_name}`,
    black_stroke_only_test
  )
};