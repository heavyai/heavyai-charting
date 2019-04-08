const fs = require('fs');
const os = require('os');
const child_process = require('child_process');
const extend = require('extend');
const crypto = require('crypto');
const path = require('path');
const callsite = require('callsite');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const htmlCreator = require('html-creator');
const TRenderResult = require('./TRenderResult-test-helper').TRenderResult;

const error_report_html_style = `
html {
  font-family: 'helvetica neue', helvetica, arial, sans-serif;
}

h1 {
  letter-spacing: 2px;
}

table {
  table-layout: fixed;
  width: 100%;
  max-width: 1200px;
  border-collapse: collapse;
  border-spacing: 0;
  border-color: black;
  background-color: rgb(231, 231, 231);
}

thead {
  display: table-header-group;
  vertical-align: middle;
  border-color: inherit;
}

th, td {
  padding: 20px;
}

th {
  letter-spacing: 2px;
}

td {
  letter-spacing: 1px;
}

tbody td {
  text-align: center;
  border: 1px solid darkgray;
}

thead th, tfoot th, tfoot td {
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.2));
  border: 2px solid black;
}

tbody tr:nth-child(odd) {
  background-color: transparent;
}

tbody tr:nth-child(even) {
  background-color: rgba(0,0,0,0.05);
}

img {
  box-sizing: content-box;
  background: white;
}`;

function buildTableRow() {
  return {type: 'tr', content: []};
}

function addHeaderToRow(tr, header_name) {
  tr.content.push({type: 'th', content: header_name});
}

function addImageToRow(tr, base_dir, img_info) {
  const rel_img_file = path.relative(base_dir, img_info.filename);
  tr.content.push({
    type: 'td',
    content: [
      {
        type: 'a',
        attributes: {
          href: rel_img_file
        },
        content: [
          {
            type: 'img',
            attributes: {
              src: rel_img_file,
              style: `${img_info.height > img_info.width ? 'height' : 'width'}: 150px`
            }
          }
        ]
      }
    ]
  })
}

function addErrorToRow(tr, error_info, base_dir, config_dir, config_prefix, idx) {
  // {
  //   test_name: img.test_name,
  //   config: {
  //     cmd: img.cmd,
  //     args: img.args
  //   },
  //   src: {
  //     filename: "",
  //     width: 0,
  //     height: 0
  //   },
  //   dst: dst_file,
  //   diff: diff_file
  // }

  
  const test_name_item = {type: 'td', content: error_info.test_name || ' '};
  tr.content.push(test_name_item);

  const test_config_item = {type: 'td'};
  if (error_info.config) {
    const relpath = path.relative(base_dir, config_dir);
    const config_filename = config_prefix + `-${idx}.json`;
    fs.writeFileSync(path.join(config_dir, config_filename), JSON.stringify(error_info.config, null, 2));
    test_config_item.content = [
      {
        type: 'a',
        attributes: {
          href: path.join(relpath, config_filename)
        },
        content: config_prefix + `.json`
      }
    ]
  } else {
    test_config_item.content = ' ';
  }
  tr.content.push(test_config_item);

  addImageToRow(tr, base_dir, error_info.src);
  addImageToRow(tr, base_dir, error_info.dst);
  addImageToRow(tr, base_dir, error_info.diff);
}


function readImage(img) {
  let data = null;
  if (img instanceof Uint8Array) {
    data = Buffer.from(img, 'base64');
  } else {
    data = fs.readFileSync(img);
  }
  const image = PNG.sync.read(data);
  image.format = 'png';
  return image;
}

function copyImage(img, out_file) {
  if (img instanceof Uint8Array) {
    fs.writeFileSync(out_file, Buffer.from(img, 'base64'));
    return;
  }
  fs.copyFileSync(img, out_file);
}

function compareImages(src_img, dst_img, options) {
  const diff_img = new PNG({width: src_img.width, height: src_img.height});
  diff_img.format = 'png';

  let tolerance = 0.05;

  // outputting the diff image
  if (typeof options === 'object') {
    if (options.file) {
      if (typeof options.file !== 'string') {
        throw new TypeError('The path for the diff output must be a string.');
      }
      diff_img.filename = options.file;
    }

    if (typeof options.threshold !== 'undefined') {
      tolerance = options.threshold;
    }
  }

  if (typeof tolerance !== 'number') {
    throw new TypeError('The tolerance value should be a number');
  }

  const total_img_diff = pixelmatch(src_img.data, dst_img.data, diff_img.data, diff_img.width, diff_img.height, {threshold: tolerance});

  if (diff_img.filename) {
    fs.writeFileSync(diff_img.filename, PNG.sync.write(diff_img));
  }

  return {
    is_equal: total_img_diff === 0,
    total_img_diff,
    diff_img
  };
}

function makeDirectory(dir_name) {
  if (!fs.existsSync(dir_name)) {
    fs.mkdirSync(dir_name);
  }
}

class ImageCompareReporter {
  constructor(assert_lib, config) {
    this.config = {
      golden_img_dir: './',
      highlight_color: 'yellow',
      highlight_style: 'threshold',
      threshold: 0.001
    };

    extend(this.config, config || {});

    const basedir = path.dirname(callsite()[1].getFileName());
    if (!this.config.golden_img_dir) {
      this.config.golden_img_dir = basedir;
    } else if (!path.isAbsolute(this.config.golden_img_dir)) {
      this.config.golden_img_dir =
          path.join(basedir, this.config.golden_img_dir);
    }

    this._rm_clean_report = true;
    if (!this.config.report_dir) {
      this.config.report_dir =
          fs.mkdtempSync(path.join(os.tmpdir(), 'img-compare-report-'));
    } else {
      if (fs.existsSync(this.config.report_dir)) {
        this._rm_clean_report = false;
      }
      makeDirectory(this.config.report_dir);
    }

    this._image_dir = path.join(this.config.report_dir, "images");
    makeDirectory(this._image_dir);

    this._config_dir = path.join(this.config.report_dir, "test-configs");
    makeDirectory(this._config_dir);

    this._initialized = false;
    this._errors = [];

    if (typeof assert_lib.assert === 'function' &&
        typeof assert_lib.should === 'function' &&
        typeof assert_lib.expect === 'function' &&
        typeof assert_lib.use === 'function') {
      // The assert library is 'chai'. Is this good enough to check that it is
      // indeed the chai lib?
      const boundInitChai = this._initChai.bind(this);
      assert_lib.use(boundInitChai);
    }
  }

  get image_dir() {
    return this._image_dir;
  }

  reportErrors() {
    if (this._errors.length) {
      this._buildErrorReportHtml();
    } else if (this._rm_clean_report) {
      fs.rmdirSync(this.config.report_dir);
    }
  }

  _buildErrorReportHtml() {
    const html_creator = new htmlCreator();
    html_creator.document.setContent([{type: 'head'}, {type: 'body', attributes: {align: "center"}}]);

    const html_head = html_creator.document.findElementByType('head');
    html_head.content = [{type: 'title', content: 'Image Comparison Report'}];
    html_head.content.push({type: 'style', content: error_report_html_style});

    const html_body = html_creator.document.findElementByType('body');
    html_body.content = [{type: 'h1', attributes: {align: "center"}, content: "Image Comparison Report"}];

    // TODO: add other header info about the test

    // build the table
    const html_table = {type: 'table', attributes: {align: "center"}, content: []};

    // build the table header
    const html_table_header_row = buildTableRow();
    addHeaderToRow(html_table_header_row, 'Test Name');
    addHeaderToRow(html_table_header_row, 'Config');
    addHeaderToRow(html_table_header_row, 'Expected');
    addHeaderToRow(html_table_header_row, 'Actual');
    addHeaderToRow(html_table_header_row, 'Diff');
    const html_table_header = {type: 'thead', content: [html_table_header_row]};
    html_table.content.push(html_table_header);

    // build table body
    const html_table_body = {type: 'tbody', content: []};
    this._errors.forEach((error_info, idx) => {
      const html_table_body_row = buildTableRow();
      addErrorToRow(html_table_body_row, error_info, this.config.report_dir, this._config_dir, error_info.test_name || "img-compare-test", idx);
      html_table_body.content.push(html_table_body_row);
    });
    html_table.content.push(html_table_body);

    // build the table header row

    html_body.content.push(html_table);

    const report_filename = path.join(this.config.report_dir, 'index.html');
    fs.writeFileSync(report_filename, html_creator.renderHTML());

    console.log(`Found ${this._errors.length} image compare error${this._errors.length > 1 ? "s" : ""}. Report can be found here ${report_filename}`)
  }

  _reportError(img, src_img_info, dst_img_info, diff_img_info) {
    if (img instanceof TRenderResult) {
      this._errors.push({
        test_name: img.test_name,
        config: {
          cmd: img.cmd,
          args: img.args
        },
        src: src_img_info,
        dst: dst_img_info,
        diff: diff_img_info
      });
    } else {
      this._errors.push({
        src: src_img_info,
        dst: dst_img_info,
        diff: diff_img_info
      });
    }
  }

  _initChai(chai, utils) {
    if (this._initialized) {
      // TODO: throw a warning if this is configured for another lib
      return;
    }

    chai.Assertion.addMethod('matchGoldenImage', matchGoldenImage);
    chai.Assertion.addMethod('matchesGoldenImage', matchGoldenImage);
    // eslint-disable-next-line consistent-this
    const reporter = this;
    const config = this.config;

    function matchGoldenImage(golden_image_name) {
      const image = this._obj;
      const image_dir = reporter.image_dir;

      chai.assert(
          image instanceof Uint8Array || typeof image === 'string' ||
              image instanceof String,
          'Image must be a base-64 byte array or a filename');
      chai.assert(
          typeof golden_image_name === 'string' ||
              golden_image_name instanceof String,
          'Golden image must be a filename string');

      if (!path.isAbsolute(golden_image_name)) {
        golden_image_name = path.join(config.golden_img_dir, golden_image_name);
      }
      const fileprefix = crypto.randomBytes(5).toString('hex');

      const src = readImage(image);
      const dst = readImage(golden_image_name);

      src.filename =
          path.join(image_dir, fileprefix + '-src.' + src.format.toLowerCase());
      copyImage(image, src.filename);

      dst.filename =
          path.join(image_dir, fileprefix + '-dst.' + dst.format.toLowerCase());
      copyImage(golden_image_name, dst.filename);

      const diff_file = path.join(
          image_dir, fileprefix + '-diff.' + src.format.toLowerCase());

      const compare_config = {file: diff_file};
      extend(compare_config, config);
      const compare_result = compareImages(src, dst, compare_config);
      const diff = compare_result.diff_img;

      const is_equal = src.format === dst.format &&
          src.width === dst.width && src.height === dst.height && compare_result.is_equal;

      const negate = Boolean(utils.flag(this, 'negate'));
      if (negate === is_equal) {
        // attempting to catch errors thrown by the below assert. The 'negate'
        // flag negates the assertion check
        reporter._reportError(utils.flag(this, 'TRenderResult'), src, dst, diff);
      } else {
        // clean up clean-running tests
        fs.unlinkSync(src.filename);
        fs.unlinkSync(dst.filename);
        fs.unlinkSync(diff.filename);
      }

      this.assert(
          is_equal,
          `Expected input image (${src.format} ${
              src.width}x${src.height}) to be equal to ${golden_image_name} (${
              dst.format} ${dst.width}x${dst.height}) (${
              compare_result.total_img_diff} pixels with difference > ${config.threshold}).`,
          `Did not expected input image (${src.format} ${
              src.width}x${src.height}) to be equal to ${golden_image_name} (${
              dst.format} ${dst.width}x${dst.height}) (${
              compare_result.total_img_diff} pixels with a difference < ${config.threshold}).`);
    }

    this._initialized = true;
  }
}

module.exports = ImageCompareReporter;