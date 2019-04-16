const PNG = require('pngjs').PNG;

module.exports = {
  emptyPng: (width, height, use_alpha = true) => {
    return new PNG({ width, height, colorType: use_alpha ? 6 : 2 });
  }
};
