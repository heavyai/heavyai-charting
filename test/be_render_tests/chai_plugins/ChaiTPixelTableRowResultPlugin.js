const wellknown = require("wellknown");
const TPixelTableRowResult = require("../lib/TestResultWrapper").TPixelTableRowResult;
const ObjUtils = require("../utils/ObjUtils");

module.exports = function(chai, utils) {
  chai.Assertion.addProperty("TPixelTableRowResult", function() {
    this.assert(
      this._obj instanceof TPixelTableRowResult,
      "Expected #{this} to be a TPixelTableRowResult",
      "Expected #{this} to not be a TPixelTableRowResult"
    );
  });

  chai.Assertion.addChainableMethod("numrows", null, function() {
    const obj = this._obj;
    if (obj instanceof TPixelTableRowResult) {
      utils.flag(this, "TPixelTableRowResult", this._obj);
      this._obj = obj.num_rows;
    } else {
      this.assert(false, `expected #{this} to have a numrows property.`);
    }
  });

  chai.Assertion.addChainableMethod("column", function(column_name) {
    const obj = this._obj;
    if (obj instanceof TPixelTableRowResult) {
      utils.flag(this, "TPixelTableRowResult", this._obj);
      this._obj = obj.getColumn(column_name);
    } else {
      this.assert(false, `expected #{this} to have a column() method. Object is of type ${ObjUtils.toString(obj)}`);
    }
  });

  function arrayEqual(arr1, arr2, tolerance, in_idx = []) {
    if (!Array.isArray(arr1)) {
      throw new Error(`Expected ${arr1} to be an array.`);
    }
    if (!Array.isArray(arr2)) {
      throw new Error(`Expected ${arr2} to be an array.`);
    }

    if (arr1.length !== arr2.length) {
      throw new Error(
        `Expected array ${in_idx.length
          ? "at index (" + in_idx.join(",") + ")"
          : ""} to have ${arr1.length} items but got ${arr2.length}`
      );
    }

    for (let i = 0; i < arr1.length; ++i) {
      if (Array.isArray(arr1[i])) {
        in_idx.push(i);
        return arrayEqual(arr1[i], arr2[i], tolerance, in_idx);
      }

      if (Math.abs(arr1[i] - arr2[i]) > tolerance) {
        throw new Error(
          `Expected vertex coordinate at index (${in_idx.join(",")}) to be` +
            `${tolerance ? " within " + tolerance + " tolerance of" : ""}` +
            ` ${arr1[i]} but got ${arr2[i]}`
        );
      }
    }
  }

  chai.Assertion.addChainableMethod("wktEquals", function(val, tolerance) {
    const that = this;
    const obj = this._obj;

    function getGeoJsonFromWkt(wkt) {
      that.assert(
        wkt instanceof String || typeof wkt === "string",
        `#{this} must be a string for wellknown text comparisons.`
      );

      const geojson = wellknown.parse(wkt);
      const geojson_assert = new chai.Assertion(geojson);
      geojson_assert.assert(Boolean(geojson), `Expected "${wkt}" to be valid wellknown text.`);

      return geojson;
    }

    const in_geojson = getGeoJsonFromWkt(obj);
    const out_geojson = getGeoJsonFromWkt(val);

    let wkt_equal = in_geojson.type === out_geojson.type;
    let err_str = "";
    if (wkt_equal) {
      try {
        arrayEqual(out_geojson.coordinates, in_geojson.coordinates, tolerance);
      } catch (err) {
        err_str = err.message;
        wkt_equal = false;
      }
    }
    this.assert(
      wkt_equal,
      `Expected "${obj}" to equal "${val}". ${err_str}`,
      `Expected "${obj}" to not equal "${val}"`
    );
  });
};
