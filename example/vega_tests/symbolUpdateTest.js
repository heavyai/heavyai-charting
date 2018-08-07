document.addEventListener("DOMContentLoaded", () => {
  const symbol_update1 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as y, count(*) as color FROM contributions WHERE ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [
          1,
          100000
        ],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.946666666666667,
          "height": 11.485421355078957,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          }
        }
      }
    ]
  }

  const symbol_update2 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as y, count(*) as color FROM contributions WHERE ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "heat_color",
        "type": "quantize",
        "domain": [
          1,
          100000
        ],
        "range": [
          "#115f9a",
          "#1984c5",
          "#22a7f0",
          "#48b5c4",
          "#76c68f",
          "#a6d75b",
          "#c9e52f",
          "#d0ee11",
          "#d0f400"
        ],
        "default": "#0d0887",
        "nullValue": "#0d0887"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.946666666666667,
          "height": 11.485421355078957,
          "fillColor": {
            "scale": "heat_color",
            "field": "color"
          },
          "strokeColor": "black",
          "strokeWidth": 1
        }
      }
    ]
  }

  const symbol_update3 = {
    "width": 800,
    "height": 560,
    "data": [
      {
        "name": "heatmap_query",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-13902412.502438568,-7191838.923040948,conv_4326_900913_y(lat),2287112.396102004,6984513.901690078,9.946666666666667,11.485421355078957,0,0,800,560) as y, count(*) as color FROM contributions WHERE ((lon >= -124.88749638788404 AND lon <= -64.60538826379779) AND (lat >= 20.1188223979657 AND lat <= 53.008194919853)) GROUP BY x, y"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_query"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.946666666666667,
          "height": 11.485421355078957,
          "fillColor": "rgba(0,0,0,0)",
          "strokeColor": "black",
          "strokeWidth": 1
        }
      }
    ]
  }

  const symbol_update4 = {
    "width": 1439,
    "height": 675,
    "data": [
      {
        "name": "heatmap_querygeoheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -179.99999999999898 AND lon <= 179.9999999999992) AND (lat >= -46.714267629887104 AND lat <= 74.93106240320944)) AND (followers > 100000000) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -20037508.340039887,
          20037508.340039913
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -5895559.350551447,
          12902659.036631681
        ],
        "range": "height"
      },
      {
        "name": "heat_colorgeoheat",
        "type": "quantize",
        "domain": [
          0,
          0
        ],
        "range": [
          "rgba(17,95,154,0.5)",
          "rgba(25,132,197,0.5)",
          "rgba(34,167,240,0.5)",
          "rgba(72,181,196,0.5)",
          "rgba(118,198,143,0.5)",
          "rgba(166,215,91,0.5)",
          "rgba(201,229,47,0.5)",
          "rgba(208,238,17,0.5)",
          "rgba(208,244,0,0.5)"
        ],
        "default": "rgba(13,8,135,0.5)",
        "nullValue": "rgba(13,8,135,0.5)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_querygeoheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.993055555555555,
          "height": 11.53898663005377,
          "fillColor": {
            "scale": "heat_colorgeoheat",
            "field": "color"
          }
        }
      }
    ]
  }

  const symbol_update5 = {
    "width": 1439,
    "height": 675,
    "data": [
      {
        "name": "heatmap_querygeoheat",
        "sql": "SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as x, reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(lon),-20037508.340039887,20037508.340039913,conv_4326_900913_y(lat),-5895559.350551447,12902659.036631681,9.993055555555555,11.53898663005377,0,0,1439,675) as y, count(*) as color FROM tweets_nov_feb_60M WHERE ((lon >= -179.99999999999898 AND lon <= 179.9999999999992) AND (lat >= -46.714267629887104 AND lat <= 74.93106240320944)) GROUP BY x, y"
      }
    ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "domain": [
          -20037508.340039887,
          20037508.340039913
        ],
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "domain": [
          -5895559.350551447,
          12902659.036631681
        ],
        "range": "height"
      },
      {
        "name": "heat_colorgeoheat",
        "type": "quantize",
        "domain": [
          1,
          128138.69139420395
        ],
        "range": [
          "rgba(17,95,154,0.5)",
          "rgba(25,132,197,0.5)",
          "rgba(34,167,240,0.5)",
          "rgba(72,181,196,0.5)",
          "rgba(118,198,143,0.5)",
          "rgba(166,215,91,0.5)",
          "rgba(201,229,47,0.5)",
          "rgba(208,238,17,0.5)",
          "rgba(208,244,0,0.5)"
        ],
        "default": "rgba(13,8,135,0.5)",
        "nullValue": "rgba(13,8,135,0.5)"
      }
    ],
    "marks": [
      {
        "type": "symbol",
        "from": {
          "data": "heatmap_querygeoheat"
        },
        "properties": {
          "shape": "hexagon-horiz",
          "xc": {
            "field": "x"
          },
          "yc": {
            "field": "y"
          },
          "width": 9.993055555555555,
          "height": 11.53898663005377,
          "fillColor": {
            "scale": "heat_colorgeoheat",
            "field": "color"
          }
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
      let results = con.renderVega(1, JSON.stringify(symbol_update1))
      let blobUrl = "data:image/png;base64," + results.image
      const w = window.open("symbolUpdateTest", "symbolUpdateTest results")
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update1))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update2))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update3))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // empty image
      results = con.renderVega(1, JSON.stringify(symbol_update4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      results = con.renderVega(1, JSON.stringify(symbol_update5))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")

      // empty image
      results = con.renderVega(1, JSON.stringify(symbol_update4))
      blobUrl = "data:image/png;base64," + results.image
      w.document.write("<img src='" + blobUrl + "' alt='backend-rendered png'/>")
    })
})
