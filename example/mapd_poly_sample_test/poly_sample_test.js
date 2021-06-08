"use strict"

document.addEventListener("DOMContentLoaded", () => {
  const conn = new MapdCon()
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

      for (let i=0; i<500; ++i) {
        const querystr = "SELECT bbl as key0, avg(heightroof) as color, count(*) as cnt, SAMPLE(mapd_geo) as mapd_geo, SAMPLE(rowid) as origin_rowid FROM CROOT_poly_sample_test GROUP BY key0"

        const results = conn.query(querystr)
        results.forEach((row) => {
          const key = row.key0
          const geo = row.mapd_geo
          const origin_rowid = row.origin_rowid
          if (key === undefined || geo === undefined || origin_rowid === undefined) {
            throw Error(`Invalid row error ${row}`)
          }

          const new_querystr = `SELECT bbl as key, mapd_geo FROM CROOT_poly_sample_test WHERE rowid=${origin_rowid}`
          const new_results = conn.query(new_querystr)
          if (new_results.length !== 1) {
            throw Error(`Invalid origin results ${new_results}`)
          }
          const origin_key = new_results[0].key
          const origin_geo = new_results[0].mapd_geo
          if (origin_key === undefined || origin_geo === undefined) {
            throw Error(`Invalid origin data row ${new_results[0]}`)
          }

          if (origin_geo !== geo) {
            console.log(`Got a problem with origin rowid ${origin_rowid} with key ${origin_key}: got "${geo}", but the origin should've been "${origin_geo}" - checking the key`)

            const key_querystr = `SELECT rowid, mapd_geo FROM CROOT_poly_sample_test WHERE bbl like '${origin_key}'`
            const key_results = conn.query(key_querystr)
            let found = false
            key_results.forEach((row) => {
              if (found) {
                return
              }

              if (row.mapd_geo === geo) {
                found = true
              }
            })

            if (!found) {
              throw Error(`Got a problem with origin rowid ${origin_rowid} with key ${origin_key}: got "${geo}", but the origin should've been "${origin_geo}" and could not find the geo in the group`)
            }
          }
        })

        if (i%10 === 0) {
          console.log(`Done with iteration ${i}`)
        }
      }
      console.log("DONE!!!")
    })
})
