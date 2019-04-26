const OmniSciServerTestGroup = require('../../lib/OmniSciServerTestGroup');
const RenderVegaTest = require('../../lib/RenderVegaTest');

module.exports = function(test_collection, expect) {
  const update_data_test_grp = new OmniSciServerTestGroup({
    test_description: `Tests various render vegas to validate that successive renders with varying changes in the query renders appropriately.`,
    golden_img_dir: `./golden_images`
  });
  test_collection.addTestGroup(update_data_test_grp);
};
