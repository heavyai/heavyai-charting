const OmniSciServerTestGroup = require("../../lib/OmniSciServerTestGroup");
const RenderVegaTest = require("../../lib/RenderVegaTest");
const GetResultRowForPixelTest = require("../../lib/GetResultRowForPixelTest");

module.exports = function(test_collection, expect) {
  const zipcode_hittest_grp = new OmniSciServerTestGroup({
    test_description: `Tests a handful of vega renders and hit-testing against a zipcode poly table`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(zipcode_hittest_grp);

  // prettier-ignore
  const vega = {
    "width": 1183,
    "height": 1059,
    "data": [
      {
        "name": "zipcodes",
        "format": "polys",
        "sql": "SELECT rowid from zipcodes_2017"
      }
    ],
    "projections": [
      {
        "name": "merc",
        "type": "mercator",
        "bounds": {
          "x": [ -122.57, -122.1 ],
          "y": [ 37.61, 37.94 ]
        }
      }
    ],
    "marks": [
      {
        "type": "polys",
        "from": { "data": "zipcodes" },
        "properties": {
          "x": { "field": "x" },
          "y": { "field": "y" },
          "fillColor": "red"
        },
        "transform": { "projection": "merc" }
      }
    ]
  };

  const zipcode_getresultrow_test = new GetResultRowForPixelTest(
    {
      pixel: { x: 326, y: 514 },
      table_col_names: {
        zipcodes: [ "ZCTA5CE10", "omnisci_geo" ]
      }
    },
    (result) => {
      expect(result).to.have.column("ZCTA5CE10").that.equals("94117");

      const expected_wkt =
        "MULTIPOLYGON (((-122.477296992427 37.7660689771949,-122.47737896744 37.7654819925155,-122.458404937041 37.7661599627538,-122.457789956805 37.7660149977384,-122.457535985139 37.7635659732686,-122.455998995554 37.7639039735142,-122.456993927461 37.7618419834235,-122.459172970829 37.761911972315,-122.45594392645 37.7602389863507,-122.456602995497 37.7592349600788,-122.454001923303 37.7587849776069,-122.451816928783 37.7594529733804,-122.447681968309 37.7591899911683,-122.446782925374 37.7617809631684,-122.445308967701 37.7618799953544,-122.442914928516 37.7636479901912,-122.443346931806 37.765332962277,-122.441241984461 37.7652709781031,-122.438199940342 37.7671589598838,-122.435623930039 37.7673279809613,-122.435793998854 37.7690579638672,-122.429127955078 37.7694559785395,-122.428425970687 37.7704519581843,-122.42917799504 37.7741809830881,-122.429928929745 37.7779089602539,-122.430114924177 37.7788419918059,-122.444966986051 37.7769579914291,-122.444779985791 37.7760169970691,-122.446470950938 37.7758019593432,-122.446845957286 37.777668986366,-122.453187956686 37.7768529661823,-122.452809932853 37.7749949916149,-122.463748987049 37.7736239637125,-122.464610981971 37.7724399779795,-122.459161990536 37.7713139950164,-122.45990093912 37.7704419837196,-122.464401937306 37.7696689626992,-122.467003931509 37.7680129919984,-122.469757973435 37.7692089638529,-122.472244967926 37.768609993052,-122.473123978112 37.7671159607205,-122.477296992427 37.7660689771949)))";
      expect(result).to.have.column("omnisci_geo").that.wktEquals(expected_wkt, 0.000001);
    }
  );

  let prev_test_name = zipcode_hittest_grp.addTest(
    `Should render all zipcode polygons red using a legacy poly cache render and successfully hit-test the zipcode '94117'.`,
    [
      new RenderVegaTest(vega, (result) => expect(result).to.matchGoldenImage("poly_hittest_test_01.png")),
      zipcode_getresultrow_test
    ]
  );

  zipcode_hittest_grp.addTest(
    `Should be the exact same hit-test test as ${prev_test_name}, but adds an additional column to the render.`,
    [
      new RenderVegaTest(
        (() => {
          vega.data[0].sql = "SELECT rowid, ALAND10 as area from zipcodes_2017";
          return vega;
        })(),
        (result) => expect(result).to.matchGoldenImage("poly_hittest_test_01.png")
      ),
      zipcode_getresultrow_test
    ]
  );

  zipcode_hittest_grp.addTest(
    `Adds the ZCTA5CE10 column to the query and still should return the same result as ${prev_test_name}.`,
    [
      new RenderVegaTest(
        (() => {
          vega.data[0].sql = "SELECT rowid, ZCTA5CE10 from zipcodes_2017";
          return vega;
        })(),
        (result) => expect(result).to.matchGoldenImage("poly_hittest_test_01.png")
      ),
      zipcode_getresultrow_test
    ]
  );

  zipcode_hittest_grp.addTest(
    `Makes the query into a group-by query with a HAVING. Should return the same result as ${prev_test_name}.`,
    [
      new RenderVegaTest(
        (() => {
          vega.data[0].sql =
            "SELECT zipcodes_2017.rowid, zipcodes_2017.ZCTA5CE10 as key0, avg(ALAND10) as color FROM zipcodes_2017 GROUP BY zipcodes_2017.rowid, key0 HAVING key0 ilike '941__' ORDER BY rowid";
          return vega;
        })(),
        (result) => expect(result).to.matchGoldenImage("poly_hittest_test_02.png")
      ),
      zipcode_getresultrow_test
    ]
  );

  zipcode_hittest_grp.addTest(
    `Makes the query into a immerse-style geo-join query. Should return the same hit-test result as ${prev_test_name}.`,
    [
      new RenderVegaTest(
        (() => {
          vega.data[0].sql =
            "SELECT zipcodes_2017.rowid, contributions.contributor_zipcode as key0, count(*) as color FROM contributions, zipcodes_2017 WHERE (contributions.contributor_zipcode = zipcodes_2017.ZCTA5CE10) GROUP BY zipcodes_2017.rowid, key0";
          return vega;
        })(),
        (result) => expect(result).to.matchGoldenImage("poly_hittest_test_01.png")
      ),
      zipcode_getresultrow_test
    ]
  );
};
