const chaiTRenderResultsPlugin = require('./ChaiTRenderResultPlugin');
const chaiTPixelTableRowResultPlugin = require('./ChaiTPixelTableRowResultPlugin');
const chaiTMapDExceptionPlugin = require('./ChaiTMapDExceptionPlugin');
module.exports = {
  addChaiPlugins: (chai) => {
    chai.use(chaiTRenderResultsPlugin);
    chai.use(chaiTPixelTableRowResultPlugin);
    chai.use(chaiTMapDExceptionPlugin);
  }
};
