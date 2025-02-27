const webpack = require("webpack")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const path = require("path")

module.exports = {
  context: __dirname,
  entry: {
    charting: "./index.js"
  },
  output: {
    path: path.join(__dirname, "/dist"),
    filename: "[name].js",
    libraryTarget: "umd",
    library: "charting"
  },
  externals: {
    d3: "d3",
    crossfilter: {
      commonjs: "crossfilter",
      commonjs2: "crossfilter",
      amd: "crossfilter"
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
        use: [
          "style-loader",
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader"
        ]
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              // eslint-disable-next-line global-require
              implementation: require("sass-embedded"),
              api: "modern"
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new MiniCssExtractPlugin({ filename: "charting.css" })
  ]
}
