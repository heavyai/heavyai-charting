var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var path = require("path");

module.exports = {
  context: __dirname,
  entry: {
    "mapdc": "./index.js"
  },
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    libraryTarget: "umd",
    library: "mapdc"
  },
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
        loader: "babel-loader"
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract("style", "css!sass")
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
    new ExtractTextPlugin("chart.css"),
    new webpack.optimize.DedupePlugin(),
  ],
  resolve: {
    extensions: ["", ".js"]
  }
};
