var webpack = require("webpack");
var path = require("path");

module.exports = {
  context: __dirname,
  entry: {
    "mapdc": "./example.entry.js"
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    libraryTarget: "umd",
    library: "mapdc"
  },
  devtool: "source-map",
  externals: {
    "d3": "d3",
    "crossfilter": {
      "commonjs": "crossfilter",
      "commonjs2": "crossfilter",
      "amd": "crossfilter",
    }
  },
  module: {
    loaders: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        include: [
          path.resolve(__dirname, 'overrides'),
          path.resolve(__dirname, 'index.js'),
          path.resolve(__dirname, 'mapdc.js'),
          path.resolve(__dirname, 'example.entry.js')
        ],
        loader: "babel-loader"
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
  ],
  resolve: {
    extensions: ["", ".js"]
  }
};
