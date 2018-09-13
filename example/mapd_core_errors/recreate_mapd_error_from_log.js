"use strict"

document.addEventListener("DOMContentLoaded", () => {
  const inputElement = document.getElementById("fileinput")
  inputElement.addEventListener("change", () => {
    const file = inputElement.files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split("\n")
      const line_header_regex = /^(\w+)\s+(\d{2}:\d{2}:\d{2}\.\d{6})\s+(\d+)\s+(\w+\.\w+):(\d+)\]\s+(.*)$/

      const run_render = true
      const render_vega_regex = /^render_vega\s+:(\w+):widget_id:(\d+):compression_level:(\d+):vega_json:(.*):nonce:(\d+)$/
      const run_sql = true
      const sql_execute_regex = /^sql_execute\s+:(\w+):query_str:(.*)$/
      const run_hittest = true
      const hittest_execute_regex = /^get_result_row_for_pixel\s+:(\w+):widget_id:(\d+):pixel\.x:(\d+):pixel\.y:(\d+):column_format:([01]):pixel_radius:(\d+):table_col_names:([\w,]+):nonce:(\d+)$/
      const run_new_connections = true
      const run_async = true
      const save_vega_img = true
      // new MapdCon()
      //   .protocol("http")
      //   .host("localhost")
      //   .port("1024")
      //   .dbName("mapd")
      //   .user("mapd")
      //   .password("HyperInteractive")
      //   .connect((error, con) => {
      //     if (error) {
      //       throw error
      //     }
      //     for (let lineno = 0; lineno < lines.length; ++lineno) {
      //       const headermatch = lines[lineno].match(line_header_regex)
      //       if (headermatch) {
      //         const logstr = headermatch[headermatch.length - 1]
      //         const rendervegamatch = logstr.match(render_vega_regex)
      //         if (rendervegamatch) {
      //           const session_id = rendervegamatch[1]
      //           const widget_id = parseInt(rendervegamatch[2])
      //           const vega = rendervegamatch[4]
      //           console.log("Rendering vega from line: " + lineno)
      //           try {
      //             const results = con.renderVega(widget_id, vega)
      //           } catch (e) {
      //             if (e instanceof window.TMapDException) {
      //               console.log(e)
      //             } else {
      //               throw e
      //             }
      //           }
      //           console.log("Done rendering vega from line: " + lineno)
      //         }
      //       }
      //     }
      //   })

      var canvas = null
      if (save_vega_img) {
        canvas = document.createElement('canvas')
        document.body.appendChild(canvas)
      }

      const activeconns = {}
      let firstconn = null
      const executeConnectorCmd = (session_id, lineno, callbackFn, regexmatch) => {
        let currconn = (run_new_connections ? activeconns[session_id] : firstconn)
        let break_loop = false
        if (!currconn) {
          currconn = new MapdCon()
            .protocol("http")
            .host("localhost")
            .port("1024")
            .dbName("mapd")
            .user("mapd")
            .password("HyperInteractive")
            .connect((error, conn) => {
              if (error) {
                throw error
              }
              console.log("CREATED A NEW CONNECTION FOR LOG SESSION ID: " + session_id + ". New session id: " + conn.sessionId())
              activeconns[session_id] = conn
              callbackFn(conn, lineno, regexmatch)
              setTimeout(() => {
                processLines(++lineno)
              }, 3000)
            })
          break_loop = true
          if (!run_new_connections) {
            firstconn = currconn
          }
        } else {
          callbackFn(currconn, lineno, regexmatch)
        }
        return break_loop
      }

      const async_cb = (lineno, details, resultHandler, error, result) => {
        if (error) {
          console.log("Error", details, "line:", lineno, ". Error:", error)
        } else {
          console.log("Done", details, "from line:", lineno)
        }

        if (resultHandler) {
          resultHandler(error, result)
        }
      }

      const processLines = (startlineno) => {
        let session_id = -1, widget_id = -1
        const render_cb = (conn, lineno, rendervegamatch) => {
          const vega = rendervegamatch[4]

          const render_vega_handler = (error, result) => {
            if (!error && result) {
              if (canvas) {
                const vega_json = JSON.parse(vega)
                canvas.width = vega_json.width
                canvas.height = vega_json.height
                const blobUrl = "data:image/png;base64," + result.image
                const image = new Image();
                image.src = blobUrl

                const ctx = canvas.getContext('2d')
                ctx.drawImage(image, 0, 0)
                ctx.strokeStyle = "red"
                ctx.lineWidth = 10
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(canvas.width, 0)
                ctx.lineTo(canvas.width, canvas.height)
                ctx.lineTo(0, canvas.height)
                ctx.closePath()
                ctx.stroke()

                // image.onload = () => {
                //   const ctx = canvas.getContext('2d')
                //   ctx.drawImage(image, 0, 0)
                //   ctx.strokeStyle = "red"
                //   ctx.lineWidth = 10
                //   ctx.beginPath()
                //   ctx.moveTo(0, 0)
                //   ctx.lineTo(canvas.width, 0)
                //   ctx.lineTo(canvas.width, canvas.height)
                //   ctx.lineTo(0, canvas.height)
                //   ctx.stroke()
                // }
              }
            }
          };
          console.log("Rendering vega from line: " + lineno)
          if (run_async) {
            const cb = async_cb.bind(null, lineno, "rendering vega", save_vega_img ? render_vega_handler : null)
            conn.renderVega(widget_id, vega, null, cb)
          } else {
            try {
              conn.renderVega(widget_id, vega)
            } catch (e) {
              if (e instanceof window.TMapDException) {
                console.log(e)
              } else {
                throw e
              }
            }
            console.log("Done rendering vega from line: " + lineno)
          }
        }

        const hittest_cb = (conn, lineno, hittestmatch) => {
          console.log("Executing hittest from line: " + lineno)
          const tableColsMap = {}
          const tableCols = hittestmatch[7].split(',')
          tableColsMap[tableCols.splice(0, 1)[0]] = tableCols
          if (run_async) {
            const cb = async_cb.bind(null, lineno, "executing hit-test", null)
            conn.getResultRowForPixel(
              widget_id,
              new TPixel({x: parseInt(hittestmatch[3]), y: parseInt(hittestmatch[4])}),
              tableColsMap,
              cb)
          } else {
            try {
              conn.getResultRowForPixel(
                widget_id,
                new TPixel({x: parseInt(hittestmatch[3]), y: parseInt(hittestmatch[4])}),
                tableColsMap
              )
            } catch (e) {
              if (e instanceof window.TMapDException) {
                console.log(e)
              } else {
                throw e
              }
            }
          }
        }

        const query_cb = (conn, lineno, querymatch) => {
          console.log("Executing sql from line: " + lineno)
          const query_str = querymatch[2]
          if (run_async) {
            const cb = async_cb.bind(null, lineno, "executing sql", null)
            conn.query(query_str, null, cb)
          } else {
            try {
              conn.query(query_str)
            } catch (e) {
              if (e instanceof window.TMapDException) {
                console.log(e)
              } else {
                throw e
              }
            }
            console.log("Done executing sql from line: " + lineno)
          }
        }

        for (let lineno = startlineno; lineno < lines.length; ++lineno) {
          const headermatch = lines[lineno].match(line_header_regex)
          if (headermatch) {
            const logstr = headermatch[headermatch.length - 1]
            const rendervegamatch = logstr.match(render_vega_regex)
            const sqlexecutematch = logstr.match(sql_execute_regex)
            const hittestmatch = logstr.match(hittest_execute_regex)
            if (rendervegamatch && run_render) {
              session_id = rendervegamatch[1]
              widget_id = parseInt(rendervegamatch[2])
              if (executeConnectorCmd(session_id, lineno, render_cb, rendervegamatch)) {
                break
              }
            } else if (sqlexecutematch && run_sql) {
              session_id = sqlexecutematch[1]
              if (executeConnectorCmd(session_id, lineno, query_cb, sqlexecutematch)) {
                break
              }
            } else if (hittestmatch && run_hittest) {
              session_id = hittestmatch[1]
              widget_id = parseInt(hittestmatch[2])
              if (executeConnectorCmd(session_id, lineno, hittest_cb, hittestmatch)) {
                break
              }
            }
          }
        }
      }

      processLines(0)
    }

    reader.readAsText(file)
  }, false)
  // if (window.FILE && window.FileReader && window.FileList && window.Blob) {
  // } else {
  //   alert("The File APIs are not fully supported")
  // }
})
