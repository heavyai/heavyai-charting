var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var path = require("path");

module.exports = {
  context: __dirname,
  entry: {
    "mapdc": "./index.js",
    "mapdc.min": "./index.js"
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
        loader: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: "css-loader!sass-loader"
        })
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: "css-loader"
        })
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new ExtractTextPlugin("[name].css"),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
    }),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\min\.css$/g,
      cssProcessorOptions: { discardComments: {removeAll: true } }
    })
  ],
  resolve: {
    extensions: [".js"]
  }
};
