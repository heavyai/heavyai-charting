const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');
const ImageUtils = require('../../utils/ImageUtils');

module.exports = function(test_collection, expect) {
  const symbol_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests vega updates to the data driving properties of the 'symbol' mark type. These tests are meant to validate that any changes to the data between successive renders work appropriately.`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(symbol_test_grp);



  const width = 1439;
  const height = 675;
  const vega = {
    "width": width,
    "height": height,
    "data": [
      {
        "name": "heatmap_querygeoheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -179.99999999999898 AND lon <= 179.9999999999992) AND (lat >= -46.714267629887104 AND lat <= 74.93106240320944)) AND (followers > 100000000) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "heat_colorgeoheat",
        "type": "quantize",
        "domain": [
          1,
          128138.69139420395
        ],
        "range": [
          "rgb(17,95,154)",
          "rgb(25,132,197)",
          "rgb(34,167,240)",
          "rgb(72,181,196)",
          "rgb(118,198,143)",
          "rgb(166,215,91)",
          "rgb(201,229,47)",
          "rgb(208,238,17)",
          "rgb(208,244,0)"
        ],
        "default": "rgb(13,8,135)",
        "nullValue": "rgb(13,8,135)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_querygeoheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.993055555555555,
          "height": 11.53898663005377,
          "fillColor": {
            "scale": "heat_colorgeoheat",
            "field": "color"
          }
        }
      }
    ]
  }

  const empty_test = 
    new RenderVegaTest(vega, (result) => expect(result).to.matchImage(ImageUtils.emptyPng(width, height)));
  const empty_test_name = symbol_test_grp.addTest(
    `Executes a query that produces empty results. Should render an empty image.`,
    empty_test
  );


  // update the sql for the next test. This removes a filter that previously produced empty results
  vega.data[0].sql = "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -179.99999999999898 AND lon <= 179.9999999999992) AND (lat >= -46.714267629887104 AND lat <= 74.93106240320944)) GROUP BY x, y";

  symbol_test_grp.addTest(
    'Should render a horizontal hexagonal-binned heatmap of the US with a fillColor driven by # of contributions per bin',
    new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage('symbol_update_data_test_01.png'))
  );

  symbol_test_grp.addTest(
    `Re-executes a query producing empty results. Should produce an empty image and be exactly the same test as ${empty_test_name}.`,
    empty_test
  );
};