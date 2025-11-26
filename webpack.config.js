const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path')

module.exports = {
  mode: "production",
  context: __dirname,
  entry: {
    "charting": "./index.js"
  },
  resolve: {
    fallback: {
      "assert": require.resolve("assert/")
    }
  },
  output: {
    path: path.join(__dirname, "/dist"),
    filename: "[name].js",
    library: {
      name: "charting",
      type: "umd"
    },
    globalObject: 'this'
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
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules\/(?!@mapbox-controls\/ruler)/,
        use: "babel-loader"
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new MiniCssExtractPlugin({
      filename: "charting.css"
    }),
  ]
};
