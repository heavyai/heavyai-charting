const webpack = require("webpack")
const path = require("path")

module.exports = {
  entry: {
    "heavyai-charting": [
      "babel-polyfill",
      "script-loader!@heavyai/connector/dist/browser-connector.js",
      "script-loader!@heavyai/crossfilter/dist/mapd-crossfilter.js",
      "script-loader!@heavyai/d3-combo-chart/dist/d3ComboChart.js",
      path.resolve(__dirname, "../index.js")
    ],
    example3: path.resolve(__dirname, "./example3.js"),
    example4: path.resolve(__dirname, "./example4.js"),
    multilayermap: path.resolve(__dirname, "./exampleMultiLayerMap.js"),
    multilayerscatterplot: path.resolve(
      __dirname,
      "./exampleMultiLayerScatterplot.js"
    ),
    geoheat: path.resolve(__dirname, "./exampleGeoHeat.js"),
    windbarb: path.resolve(__dirname, "./exampleWindBarbs.js"),
    rastermesh: path.resolve(__dirname, "./exampleRasterMesh.js"),
    crosssection: path.resolve(__dirname, "./exampleCrossSection.js"),
    linecrosssection: path.resolve(__dirname, "./exampleLineCrossSection.js"),
    exampleD3ComboChartCrossfilter: path.resolve(
      __dirname,
      "./exampleD3ComboChartCrossfilter.js"
    )
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
          path.resolve(__dirname, "./exampleMultiLayerScatterplot.js")
        ],
        loader: "script-loader"
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "../src"),
          path.resolve(__dirname, "../index.js"),
          path.resolve(__dirname, "./exampleGeoHeat.js"),
          path.resolve(__dirname, "./exampleWindBarbs.js"),
          path.resolve(__dirname, "./exampleRasterMesh.js"),
          path.resolve(__dirname, "./exampleCrossSection.js"),
          path.resolve(__dirname, "./exampleLineCrossSection.js"),
          path.resolve(__dirname, "./exampleD3ComboChartCrossfilter.js")
        ],
        loader: "babel-loader"
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
  }
}
