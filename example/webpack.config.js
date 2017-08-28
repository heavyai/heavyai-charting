var webpack = require("webpack");
var path = require("path");

module.exports = {
  entry: {
    app: [
      "script-loader!@mapd/connector/dist/browser-connector.js",
      "script-loader!@mapd/crossfilter/dist/mapd-crossfilter.js",
      path.resolve(__dirname, "../index.js")
    ],
    example3: path.resolve(__dirname, "./example3.js"),
    example4: path.resolve(__dirname, "./example4.js"),
    multilayermap: path.resolve(__dirname, "./exampleMultiLayerMap.js"),
    multilayerscatterplot: path.resolve(__dirname, "./exampleMultiLayerScatterplot.js"),
    geoheat: path.resolve(__dirname, "./exampleGeoHeat.js")
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "assets"),
    publicPath: "/assets/",
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "./example3.js"),
          path.resolve(__dirname, "./exampleMultiLayerMap.js"),
          path.resolve(__dirname, "./exampleMultiLayerScatterplot.js"),
        ],
        loader: "script-loader"
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "../src"),
          path.resolve(__dirname, "../index.js"),
          path.resolve(__dirname, "./exampleGeoHeat.js")
        ],
        loader: "babel-loader"
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader" ]
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ]
      }
    ]
  }
};
