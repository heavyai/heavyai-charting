document.addEventListener("DOMContentLoaded", () => {
  const query1 = {
    width: 800,
    height: 563,
    data: [
      {
        name: "pointmap",
        sql:
          "SELECT conv_4326_900913_x(dest_lon) as x, conv_4326_900913_y(dest_lat) as y, flights.rowid FROM flights WHERE ((dest_lon >= -176.64601018675475 AND dest_lon <= 145.6212456623163) AND (dest_lat >= -50.09019104598998 AND dest_lat <= 83.97897167533588)) LIMIT 2000000"
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [-19664143.90195494, 16210482.913587093],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [-6461910.016250611, 18784858.60540035],
        range: "height"
      },
      {
        name: "pointmap_fillColor",
        type: "linear",
        domain: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        range: [
          "rgba(17,95,154,0.475)",
          "rgba(25,132,197,0.5471153846153846)",
          "rgba(34,167,240,0.6192307692307691)",
          "rgba(72,181,196,0.6913461538461538)",
          "rgba(118,198,143,0.7634615384615384)",
          "rgba(166,215,91,0.835576923076923)",
          "rgba(201,229,47,0.85)",
          "rgba(208,238,17,0.85)",
          "rgba(208,244,0,0.85)"
        ],
        accumulator: "density",
        minDensityCnt: "-2ndStdDev",
        maxDensityCnt: "2ndStdDev",
        clamp: true
      }
    ],
    marks: [
      {
        type: "symbol",
        from: {data: "pointmap"},
        properties: {
          xc: {scale: "x", field: "x"},
          yc: {scale: "y", field: "y"},
          fillColor: {scale: "pointmap_fillColor", value: 0},
          shape: "circle",
          width: 8,
          height: 8
        }
      }
    ]
  }

  new MapdCon()
    .protocol("http")
    .host("localhost")
    .port("1024")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect((error, con) => {
      if (error) {
        throw error
      }
      const results = con.renderVega(1, JSON.stringify(query1))
      const blobUrl = "data:image/png;base64," + results.image
      const w = window.open("vegaMetaDataTest", "vegaMetaDataTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
      // w.document.write()
    })
})
