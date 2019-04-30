const fs = require("fs");
const os = require("os");
const extend = require("extend");
const crypto = require("crypto");
const path = require("path");
const PNG = require("pngjs").PNG;
const pixelmatch = require("pixelmatch");
const htmlCreator = require("html-creator");
const TRenderResult = require("../lib/TestResultWrapper").TRenderResult;
const PathUtils = require("./PathUtils");

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
  word-wrap: break-word;
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
}

figcaption{
  font-size: 12px;
}`;

function buildTableRow() {
  return { type: "tr", content: [] };
}

function addHeaderToRow(tr, header_name) {
  tr.content.push({ type: "th", content: header_name });
}

function addImageToRow(tr, base_dir, img_info, base_goldenimg_dir) {
  const rel_img_file = path.relative(base_dir, img_info.filename);
  const img_content = [
    {
      type: "img",
      attributes: {
        src: rel_img_file,
        style: `${img_info.height > img_info.width ? "height" : "width"}: 150px`
      }
    }
  ];
  if (img_info.original_filename) {
    img_content.push({
      type: "figcaption",
      content: path.basename(img_info.original_filename)
    });
  }

  tr.content.push({
    type: "td",
    content: [
      {
        type: "a",
        attributes: { href: rel_img_file },
        content: img_content
      }
    ]
  });
}

function addErrorToRow(tr, error_info, base_dir, config_dir, golden_img_dir, config_prefix, idx) {
  const test_name_item = { type: "td", content: error_info.test_name || " " };
  tr.content.push(test_name_item);

  const test_config_item = { type: "td" };
  if (error_info.config) {
    const relpath = path.relative(base_dir, config_dir);
    const config_filename = config_prefix + `-${idx}.json`;
    fs.writeFileSync(path.join(config_dir, config_filename), JSON.stringify(error_info.config, null, 2));
    test_config_item.content = [
      {
        type: "a",
        attributes: { href: path.join(relpath, config_filename) },
        content: config_prefix + `.json`
      }
    ];
  } else {
    test_config_item.content = " ";
  }
  tr.content.push(test_config_item);

  addImageToRow(tr, base_dir, error_info.expected, golden_img_dir);
  addImageToRow(tr, base_dir, error_info.actual, golden_img_dir);
  addImageToRow(tr, base_dir, error_info.diff, golden_img_dir);
}

function readImage(img) {
  let data = null;
  if (img instanceof TRenderResult) {
    img = img.image;
  }

  let image = null;
  let orig_filename = null;
  if (!(img instanceof PNG)) {
    if (img instanceof Uint8Array) {
      data = Buffer.from(img, "base64");
    } else {
      data = fs.readFileSync(img);
      orig_filename = img;
    }
    image = PNG.sync.read(data);
  } else {
    image = img;
  }
  image.format = "png";
  image.original_filename = orig_filename;
  return image;
}

function copyImage(img, out_file) {
  if (img instanceof TRenderResult) {
    fs.writeFileSync(out_file, Buffer.from(img.image, "base64"));
  } else if (img instanceof Uint8Array) {
    fs.writeFileSync(out_file, Buffer.from(img, "base64"));
  } else if (img instanceof PNG) {
    fs.writeFileSync(out_file, PNG.sync.write(img));
  } else {
    fs.copyFileSync(img, out_file);
  }
}

const DEFAULT_GOLDEN_IMG_DIR = "./";
const DEFAULT_PIXEL_DIFF_THRESHOLD = 0.01;
const DEFAULT_NUM_PIXELS_THRESHOLD = 0;
function compareImages(src_img, dst_img, options) {
  const diff_img = new PNG({ width: src_img.width, height: src_img.height });
  diff_img.format = "png";

  const {
    pixel_diff_threshold = DEFAULT_PIXEL_DIFF_THRESHOLD,
    num_pixels_threshold = DEFAULT_NUM_PIXELS_THRESHOLD,
    file = null
  } = options;

  // outputting the diff image
  if (file !== null) {
    if (typeof file !== "string") {
      throw new TypeError("The path for the diff output must be a string.");
    }
    diff_img.filename = options.file;
  }

  if (typeof pixel_diff_threshold !== "number") {
    throw new TypeError(`The ${pixel_diff_threshold.name} value should be a number`);
  }
  if (typeof num_pixels_threshold !== "number") {
    throw new TypeError(`The ${num_pixels_threshold.name} value should be a number`);
  }

  const total_img_diff = pixelmatch(src_img.data, dst_img.data, diff_img.data, diff_img.width, diff_img.height, {
    threshold: pixel_diff_threshold
  });

  if (diff_img.filename) {
    fs.writeFileSync(diff_img.filename, PNG.sync.write(diff_img));
  }

  return {
    is_equal: total_img_diff <= num_pixels_threshold,
    total_img_diff,
    diff_img,
    options: { pixel_diff_threshold, num_pixels_threshold }
  };
}

function makeDirectory(dir_name) {
  if (!fs.existsSync(dir_name)) {
    fs.mkdirSync(dir_name);
  }
}

function build_abs_golden_img_dir(golden_img_dir) {
  const basedir = PathUtils.getCallerPath(2);
  if (!golden_img_dir) {
    return basedir;
  } else if (!path.isAbsolute(golden_img_dir)) {
    return path.join(basedir, golden_img_dir);
  }
  return golden_img_dir;
}

class ImageCompareReporter {
  constructor(assert_lib, config) {
    let {
      golden_img_dir = DEFAULT_GOLDEN_IMG_DIR,
      pixel_diff_threshold = DEFAULT_PIXEL_DIFF_THRESHOLD,
      num_pixels_threshold = DEFAULT_NUM_PIXELS_THRESHOLD,
      report_dir = fs.mkdtempSync(path.join(os.tmpdir(), "img-compare-report-"))
    } = config;

    golden_img_dir = build_abs_golden_img_dir(golden_img_dir);

    this._rm_clean_report = true;
    if (fs.existsSync(report_dir) && path.dirname(report_dir) !== os.tmpdir()) {
      this._rm_clean_report = false;
    }
    makeDirectory(report_dir);

    this._report_dir = report_dir;
    this._image_dir = path.join(report_dir, "images");
    makeDirectory(this._image_dir);

    this._config_dir = path.join(report_dir, "test-configs");
    makeDirectory(this._config_dir);

    this._initialized = false;
    this._errors = [];

    if (
      typeof assert_lib.assert === "function" &&
      typeof assert_lib.should === "function" &&
      typeof assert_lib.expect === "function" &&
      typeof assert_lib.use === "function"
    ) {
      // The assert library is 'chai'. Is this good enough to check that it is
      // indeed the chai lib?
      const boundInitChai = this._initChai.bind(this);
      assert_lib.use(boundInitChai);
    }

    this._config = { golden_img_dir, pixel_diff_threshold, num_pixels_threshold };
  }

  get image_dir() {
    return this._image_dir;
  }

  get golden_img_dir() {
    return this.config.golden_img_dir;
  }

  get config() {
    return this._config;
  }

  set config(in_config) {
    let {
      golden_img_dir = this._config.golden_img_dir || DEFAULT_GOLDEN_IMG_DIR,
      pixel_diff_threshold = this._config.pixel_diff_threshold !== undefined
        ? this._config.pixel_diff_threshold
        : DEFAULT_PIXEL_DIFF_THRESHOLD,
      num_pixels_threshold = this._config.num_pixels_threshold !== undefined
        ? this._config.num_pixels_threshold
        : DEFAULT_NUM_PIXELS_THRESHOLD
    } = in_config;
    golden_img_dir = build_abs_golden_img_dir(golden_img_dir);
    this._config = { golden_img_dir, pixel_diff_threshold, num_pixels_threshold };
  }

  reportErrors() {
    if (this._errors.length) {
      this._buildErrorReportHtml();
    } else if (this._rm_clean_report) {
      fs.rmdirSync(this._image_dir);
      fs.rmdirSync(this._config_dir);
      fs.rmdirSync(this._report_dir);
    }
  }

  _buildErrorReportHtml() {
    const html_creator = new htmlCreator();
    html_creator.document.setContent([ { type: "head" }, { type: "body", attributes: { align: "center" } } ]);

    const html_head = html_creator.document.findElementByType("head");
    html_head.content = [ { type: "title", content: "Image Comparison Report" } ];
    html_head.content.push({ type: "style", content: error_report_html_style });

    const html_body = html_creator.document.findElementByType("body");
    html_body.content = [
      {
        type: "h1",
        attributes: { align: "center" },
        content: "Image Comparison Report"
      }
    ];

    // TODO: add other header info about the test

    // build the table
    const html_table = {
      type: "table",
      attributes: { align: "center" },
      content: []
    };

    // build the table header
    const html_table_header_row = buildTableRow();
    addHeaderToRow(html_table_header_row, "Test Name");
    addHeaderToRow(html_table_header_row, "Config");
    addHeaderToRow(html_table_header_row, "Expected");
    addHeaderToRow(html_table_header_row, "Actual");
    addHeaderToRow(html_table_header_row, "Diff");
    const html_table_header = { type: "thead", content: [ html_table_header_row ] };
    html_table.content.push(html_table_header);

    // build table body
    const html_table_body = { type: "tbody", content: [] };
    this._errors.forEach((error_info, idx) => {
      const html_table_body_row = buildTableRow();
      addErrorToRow(
        html_table_body_row,
        error_info,
        this._report_dir,
        this._config_dir,
        this.golden_img_dir,
        error_info.test_name || "img-compare-test",
        idx
      );
      html_table_body.content.push(html_table_body_row);
    });
    html_table.content.push(html_table_body);

    // build the table header row

    html_body.content.push(html_table);

    const report_filename = path.join(this._report_dir, "index.html");
    fs.writeFileSync(report_filename, html_creator.renderHTML());

    console.log(
      `Found ${this._errors.length} image compare error${this._errors.length > 1
        ? "s"
        : ""}. Report can be found here file://${report_filename}`
    );
  }

  _reportError(img, src_img_info, dst_img_info, diff_img_info, compare_options) {
    if (img instanceof TRenderResult) {
      this._errors.push({
        test_name: img.test_name,
        config: { cmd: img.cmd, args: img.args },
        actual: src_img_info,
        expected: dst_img_info,
        diff: diff_img_info,
        compare_options
      });
    } else {
      this._errors.push({
        actual: src_img_info,
        expected: dst_img_info,
        diff: diff_img_info,
        compare_options
      });
    }
  }

  _initChai(chai, utils) {
    if (this._initialized) {
      // TODO: throw a warning if this is configured for another lib
      return;
    }

    chai.Assertion.addMethod("matchGoldenImage", matchImage);
    chai.Assertion.addMethod("matchesGoldenImage", matchImage);
    chai.Assertion.addMethod("matchImage", matchImage);
    chai.Assertion.addMethod("matchesImage", matchImage);
    // eslint-disable-next-line consistent-this
    const reporter = this;

    function matchImage(golden_image_name, options) {
      const image = this._obj;
      const image_dir = reporter.image_dir;

      if (options !== undefined && options !== null) {
        chai.assert(options instanceof Object, "matchImage options must be an object.");
      }

      chai.assert(
        image instanceof Uint8Array ||
          typeof image === "string" ||
          image instanceof String ||
          image instanceof TRenderResult,
        `Image must be a base-64 byte array or a filename. It is a ${image.constructor
          ? image.constructor.name
          : typeof image}.`
      );

      if (golden_image_name instanceof String || typeof golden_image_name === "string") {
        if (!path.isAbsolute(golden_image_name)) {
          golden_image_name = path.join(reporter.golden_img_dir, golden_image_name);
        }
      } else {
        chai.assert(
          golden_image_name instanceof Uint8Array ||
            golden_image_name instanceof TRenderResult ||
            golden_image_name instanceof PNG,
          `Image to match must be a ${String.name} path, ${Uint8Array.name} buffer, ${TRenderResult.name}, or a PNG. It is of type ${golden_image_name.constructor
            ? golden_image_name.constructor.name
            : typeof golden_image_name}.`
        );
      }
      const fileprefix = crypto.randomBytes(5).toString("hex");

      const src = readImage(image);
      const dst = readImage(golden_image_name);

      src.filename = path.join(image_dir, fileprefix + "-src." + src.format.toLowerCase());
      copyImage(image, src.filename);

      dst.filename = path.join(image_dir, fileprefix + "-dst." + dst.format.toLowerCase());
      copyImage(golden_image_name, dst.filename);

      const diff_file = path.join(image_dir, fileprefix + "-diff." + src.format.toLowerCase());

      const compare_options = {};
      extend(compare_options, reporter.config);
      if (options) {
        extend(compare_options, options);
      }
      compare_options.file = diff_file;
      const compare_result = compareImages(src, dst, compare_options);
      const diff = compare_result.diff_img;

      const is_equal =
        src.format === dst.format && src.width === dst.width && src.height === dst.height && compare_result.is_equal;

      const negate = Boolean(utils.flag(this, "negate"));
      if (negate === is_equal) {
        // attempting to catch errors thrown by the below assert. The 'negate'
        // flag negates the assertion check
        reporter._reportError(
          image instanceof TRenderResult ? image : utils.flag(this, "TRenderResult"),
          src,
          dst,
          diff,
          compare_result.options
        );
      } else {
        // clean up clean-running tests
        fs.unlinkSync(src.filename);
        fs.unlinkSync(dst.filename);
        fs.unlinkSync(diff.filename);
      }

      this.assert(
        is_equal,
        `Expected input image (${src.format} ${src.width}x${src.height}) to be equal to ${golden_image_name} (${dst.format} ${dst.width}x${dst.height}) (${compare_result.total_img_diff} pixels with difference > ${compare_result
          .options.pixel_diff_threshold}. Max num pixels threshold: ${compare_result.options.num_pixels_threshold}).`,
        `Did not expected input image (${src.format} ${src.width}x${src.height}) to be equal to ${golden_image_name} (${dst.format} ${dst.width}x${dst.height}) (${compare_result.total_img_diff} pixels with a difference < ${compare_result
          .options.pixel_diff_threshold}. Max num pixels threshold: ${compare_result.options.num_pixels_threshold}).`
      );
    }

    this._initialized = true;
  }
}

module.exports = ImageCompareReporter;
