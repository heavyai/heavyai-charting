/*
 * This is example code that shows how to make a scatterplot widget that backend
 * renders multiple layers.
 */

document.addEventListener("DOMContentLoaded", function init() {
  // A MapdCon instance is used for performing raw queries on a MapD GPU database.
  new MapdCon()
    .protocol("https")
    .host("metis.omnisci.com")
    .port("443")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive")
    .connect(function(error, con) {
      // Tables for the first layer of the pointmap.
      // This layer will be polygons of zipcodes and
      // will be colored by data joined from the contributions
      // table
      var tableName1 = ["contributions_donotmodify", "zipcodes_2017"];
      var table1Joins = [{
        table1: "contributions_donotmodify",
        attr1: "contributor_zipcode",
        table2: "zipcodes_2017",
        attr2: "ZCTA5CE10"
      }];
      // Table to use for the 2nd layer, which will be points
      // from a tweets table.
      var tableName2 = 'tweets_nov_feb';

      // Table to use for the 3nd layer, which will be points
      // from the contributions table.
      var tableName3 = 'contributions_donotmodify';

      // make 3 crossfilters for all 3 layers
      // A CrossFilter instance is used for generating the raw query strings for your MapdCon.

      // first layer
      var crossFilter = crossfilter.crossfilter(con, tableName1, table1Joins).then(function(cf1) {

        // second layer
        var crossFilter = crossfilter.crossfilter(con, tableName2).then(function(cf2) {

          // third layer
          var crossFilter = crossfilter.crossfilter(con, tableName3).then(function(cf3) {
              createPointMap(cf1, cf2, cf3, con)
          });
        });
      });
    });

  // function to create the backend-rendered map.
  function createPointMap(polycfLayer1, pointcfLayer2, pointcfLayer3, con) {
    var w = document.documentElement.clientWidth - 30;
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150;

    /*---------------------BASIC COUNT ON CROSSFILTER--------------------------*/
    /*
     *  Adding a basic count of the point layers using crossfilter.
     *  Note that for the count we use crossFilter itself as the dimension.
     */
    var countGroup1 = pointcfLayer2.groupAll();
    var dataCount1 = dc.countWidget(".data-count1")
                       .dimension(pointcfLayer2)
                       .group(countGroup1);

    var countGroup2 = pointcfLayer3.groupAll();
    var dataCount2 = dc.countWidget(".data-count2")
      .dimension(pointcfLayer3)
      .group(countGroup2);


    /*----------------BUILD THE LAYERS OF THE POINTMAP-------------------------*/

    /*-----BUILD LAYER #1, POLYGONS OF ZIPCODES COLORED BY AVG CONTRIBUTION----*/

    // get the dimensions used for the first layer, the polygon layer
    // we need the rowid for polygon rendering, so the dimension will be based on
    // the rowid of the zipcodes
    var polyDim1 = polycfLayer1.dimension("contributor_zipcode");

    // we're going to color based on the average contribution of the zipcode,
    // so reduce the average from the join
    var polyGrp1 = polyDim1.group().reduceAvg("contributions_donotmodify.amount", "avgContrib");

    // create the scale to use for the fill color of the polygons.
    // We're going to use the avg contribution of the zipcode to color the poly.
    // First, we define a range of colors to use. And then create a quantize scale
    // to map avg contributions to a color. In this case, quantize equally divides the
    // domain of the scale into bins to match with the # of colors. We're going to use
    // a domain of avg contributions of $0-5000. Since we've got 9 colors, the domain
    // will be split up into 9 equally-sized bins for coloring:
    // [0, 555], [556, 1100], [1101, 1665], etc.
    var polyColorRange = ["#115f9a","#1984c5","#22a7f0","#48b5c4","#76c68f","#a6d75b","#c9e52f","#d0ee11","#d0f400"]
    var polyFillColorScale = d3.scale.quantize().domain([0, 5000]).range(polyColorRange)

    // setup the first layer, the zipcode polygons
    var polyLayer1 = dc.rasterLayer("polys")
                        .crossfilter(polycfLayer1)
                        .dimension(polyDim1)
                        .setState({
                          data: [
                            {
                              table: "contributions_donotmodify",
                              attr: "contributor_zipcode"
                            }, {
                              table: "zipcodes_2017",
                              attr: "ZCTA5CE10"
                            }
                          ],
                          transform: {
                            limit: 1000000
                          },
                          mark: {
                            type: "poly",
                            strokeColor: "white",
                            strokeWidth: 0,
                            lineJoin: "miter",
                            miterLimit: 10
                          },
                          encoding: {
                            color: {
                              type: "quantitative",
                              aggregate: "AVG(contributions_donotmodify.amount)",
                              domain: [0, 5000],
                              range: polyColorRange
                            }
                          }
                        })
                       .popupColumns(['color', 'ZCTA5CE10']) // setup the columns we want to show when
                                                                  // hit-testing the polygons
                       .popupColumnsMapped({color: "avg contribution", ZCTA5CE10: 'zipcode'})
                                                                  // setup a map so rename the popup columns
                                                                  // to something readable.

                       // .popupStyle({                 // can optionally setup a different style for the popup
                       //     fillColor: "transparent"  // geometry. By default, the popup geom is colored the
                       // })                            // same as the fill/stroke color attributes


    /*-----------BUILD LAYER #2, POINTS OF TWEETS-------------*/
    /*-----SIZED BY # OF FOLLOWERS AND COLORED BY LANGUAGE----*/

    // NOTE: polygon tables are currently rendered by merc-projected vertices, so, to render
    // a polygon table in a scatterplot means the X&Y dimensions of the scatterplot should be
    // mercator-projected values. All other layers must also use mercator-projected dimensions.

    // build the dimensions for the 2rd layer, to be rendered as points from a tweets table.
    // Note that we're converting longitude and latitude to mercator-projected x,y respectively
    // as the map is a mercator-projected map.
    // We're also grabbing the language of the tweet as well as the number
    // of followers the twitter user has to color and size the points
    var pointMapDim2 = pointcfLayer2.dimension(null).projectOn(["goog_x", "goog_y", "lang as color", "followers as size"]);

    // we need separate dimensions for the x and y coordinates for point layers.
    // A filter is applied to these dimensions under the hood so that we only
    // render points that are within the view.
    var xDim2 = pointcfLayer2.dimension("goog_x");
    var yDim2 = pointcfLayer2.dimension("goog_y");

    // setup a d3 scale for the tweet layer to scale the points based on the number of
    // followers of the user.
    // # of followers will be mapped to point sizes that are linearly scaled from 2 to 12 pixels
    // 0 followers = 2 pixels in size, 5000 followers = 12 pixels, and is linearly interpolated
    // for values in between, so 2500 followers will get a point size of 7.
    // We'll clamp this scale, so points will go no smaller than 2 and no larger than 12.
    var sizeScaleLayer2 = d3.scale.linear().domain([0,5000]).range([2,12]).clamp(true);

    // setup a d3 scale to color the points. In this case we're going to color by
    // the language of the tweets. As language is a string, or category, and not a numeric domain
    // we need to use an ordinal scale, which is used to map categories to output values.
    var langDomain = ['en', 'pt', 'es', 'in', 'und', 'ja', 'tr', 'fr', 'tl', 'ru', 'ar']
    var langColors = ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b", "#bdcf32", "#ef9b20", "#4db6ac", "#edbf33", "#7c4dff"]

    var layer2ColorScale = d3.scale.ordinal().domain(langDomain).range(langColors);

    // setup the second layer, points of the tweets.
    var pointLayer2 = dc.rasterLayer("points")
                        .crossfilter(pointcfLayer2)
                        .xDim(xDim2)
                        .yDim(yDim2)
                        .setState({
                          transform: {
                            sample: true,
                            limit: 500000
                          },
                          mark: "point",
                          encoding: {
                            x: {
                              type: "quantitative",
                              field: "goog_x"
                            },
                            y: {
                              type: "quantitative",
                              field: "goog_y"
                            },
                            size: {
                              type: "quantitative",
                              field: "followers",
                              domain: [0, 5000],
                              range: [2, 12]
                            },
                            color: {
                              type: "ordinal",
                              field: "lang",
                              domain: langDomain,
                              range: langColors
                            }
                          },
                          config: {
                            point: {
                              shape: "circle"
                            }
                          }
                        })                                                   // of a tweet is not found in the domain fo the scale
                        .popupColumns(['tweet_text', 'sender_name', 'tweet_time', 'lang', 'origin', 'followers'])
                                                  // setup the columns to show when a point is properly hit-tested
                                                  // against


    /*---------------BUILD LAYER #3, POINTS OF CONTRIBUTIONS-------------------*/
    /*--------COLORED BY THE CONTRIBUTION RECIPIENT'S PARTY AFFILIATON---------*/
    /*--AND WHOSE SIZE IS DYNAMICALLY CONTROLLED BASED ON NUMBER OF PTS DRAWN--*/

    // NOTE: polygon tables are currently rendered by merc-projected vertices, so, to render
    // a polygon table in a scatterplot means the X&Y dimensions of the scatterplot should be
    // mercator-projected values. All other layers must also use mercator-projected dimensions.

    // build the dimensions for the 3nd layer, to be rendered as points from the contributions table
    // Note that we're converting longitude and latitude to mercator-projected x,y respectively
    // here as well. We're also going to color by the recepient's
    // party affiliation, so need to project on that column as well.
    var pointMapDim3 = pointcfLayer3.dimension(null).projectOn(["merc_x", "merc_y", "recipient_party as color"]);

    // we need separate dimensions for the x and y coordinates for point layers.
    // A filter is applied to these dimensions under the hood so that we only
    // render points that are within the view.
    var xDim3 = pointcfLayer3.dimension("merc_x");
    var yDim3 = pointcfLayer3.dimension("merc_y");

    // we're going to dynamically scale the size of the points here based on how many
    // points in this layer are visible in the current view.
    // If there are 20,000 pts in view, the point size will be 1, if there is 1
    // point, it's size will be 7 pixels. We'll use a non-linear scale, sqrt in this case,
    // so that sizes will converge to 7.0 faster as the # of pts goes fro 20K to 1.
    // We'll also clamp so that sizes go no less than 1 and no greater than 7 pixels.
    var dynamicSizeScale = d3.scale.sqrt().domain([100000,0]).range([1.0,7.0]).clamp(true)

    // setup a categorical, in other words ordinal, scale for the fill color of the
    // points based on the contribution recipient's party affiliation. Republicans
    // will be red and democrats will be blue.
    var layer3ColorScale = d3.scale.ordinal().domain(["D", "R"]).range(["blue", "red"]);

    var pointLayer3 = dc.rasterLayer("points")
                        .crossfilter(pointcfLayer3)
                        .setState({
                          transform: {
                            sample: true,
                            limit: 500000
                          },
                          mark: "point",
                          encoding: {
                            x: {
                              type: "quantitative",
                              field: "merc_x"
                            },
                            y: {
                              type: "quantitative",
                              field: "merc_y"
                            },
                            size: "auto",
                            color: {
                              type: "ordinal",
                              field: "recipient_party",
                              domain: ["D", "R"],
                              range: ["blue", "red"]
                            }
                          },
                          config: {
                            point: {
                              shape: "circle"
                            }
                          }
                        })
                        .xDim(xDim3)
                        .yDim(yDim3)
                        .popupColumns(['amount', 'recipient_party', 'recipient_name'])
                                                  // setup columns to show when a point is properly hit-tested




    /*---------------BUILD THE SCATTERPLOT-------------*/
    // grab the parent div.
    var parent = document.getElementById("chart1-example");

    /*
     * We need the min/max of each dimension of the scatterplot to
     * initialize a proper view. We calculate these extents first and then
     * build the scatterplot. We'll use the dimensions from the 2nd layer,
     * the tweet pts, to drive the scatterplot dimension.
     * NOTE: All x,y layer dimensions must be in the same space for the
     * scatterplot to display the layers appropriately. In this case
     * all layers use mercator-projected pts as the x/y dimensions.
     * Adding dimensions for the scatterplot chart itself must be
     * in the same space, otherwise visual wonkiness can occur
     */
    var extentMeasures = [
      {
        expression: "goog_x",
        agg_mode:"min",
        name: "xmin"
      },
      {
        expression: "goog_x",
        agg_mode:"max",
        name: "xmax"
      },
      {
        expression: "goog_y",
        agg_mode:"min",
        name: "ymin"
      },
      {
        expression: "goog_y",
        agg_mode:"max",
        name: "ymax"
      }
    ];

    pointcfLayer2.groupAll().reduce(extentMeasures).valuesAsync(true).then(function(extents) {
      /*
       * filter the 2nd layer's dimensions. These filters will disseminate to all other layers
       * upon drawing of the chart, so only need to do it for one layer.
       */
      xDim2.filter([extents.xmin, extents.xmax]);
      yDim2.filter([-8000000,8000000]);


      // create the scatterplot. NOTE: all layers must use the same X&Y dimensional space
      // for there to be obvious correlations in the render. Otherwise things may not appear
      // where you expect them to
      var pointMapChart = dc.rasterChart(parent, false) // create a raster chart. false indicates a scatterplot
                            .con(con)             // indicate the connection layer
                            .usePixelRatio(true)  // tells the widget to use the pixel ratio of the
                                                  // screen for proper sizing of the backend-rendered image
                            .height(h)  // set width/height
                            .width(w)

                            // add the layers to the pointmap
                            .pushLayer('polytable1', polyLayer1)
                            .pushLayer('table1', pointLayer2)
                            .pushLayer('table2', pointLayer3)

                            // render the grid lines
                            .renderHorizontalGridLines(true)
                            .renderVerticalGridLines(true)

                            // set the axis labels
                            .xAxisLabel('X Axis')
                            .yAxisLabel('Y Axis')

                            // and setup a buffer radius around the pixels for hit-testing
                            // This radius helps to properly resolve hit-testing at boundaries
                            .popupSearchRadius(2)
                            .enableInteractions(true) // activate interactions (zoom, pan, box-zoom)

      // now render the pointmap
      dc.renderAllAsync()


      /*---------------SETUP HIT-TESTING-------------*/
      // hover effect with popup
      // Use a flag to determine if the map is in motion
      // or not (pan/zoom/etc)
      var mapmove = false;

      // debounce the popup - we only want to show the popup when the
      // cursor is idle for a portion of a second.
      var debouncedPopup = _.debounce(displayPopupWithData, 250)
      pointMapChart.map().on('movestart', function() {
        // map has started moving in some way, so cancel
        // any debouncing, and hide any current popups.
        mapmove = true;
        debouncedPopup.cancel();
        pointMapChart.hidePopup();
      });

      pointMapChart.map().on('moveend', function(event) {
        // map has stopped moving, so start a debounce event.
        // If the cursor is idle, a popup will show if the
        // cursor is over a layer element.
        mapmove = false;
        debouncedPopup(event);
        pointMapChart.hidePopup();
      });

      pointMapChart.map().on('mousemove', function(event) {
        // mouse has started moving, so hide any existing
        // popups. 'true' in the following call says to
        // animate the hiding of the popup
        pointMapChart.hidePopup(true);

        // start a debound popup event if the map isn't
        // in motion
        if (!mapmove) {
          debouncedPopup(event);
        }
      })

      // callback function for when the mouse has been idle for a moment.
      function displayPopupWithData (event) {
        if (event.point) {
          // check the pointmap for hit-testing. If a layer's element is found under
          // the cursor, then display a popup of the resulting columns
          pointMapChart.getClosestResult(event.point, function(closestPointResult) {
            // 'true' indicates to animate the popup when starting to display
            pointMapChart.displayPopup(closestPointResult, true)
          });
        }
      }


      /*--------------------------RESIZE EVENT------------------------------*/
      /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */

      window.addEventListener("resize", _.debounce(reSizeAll, 500));

      function reSizeAll() {
        var w = document.documentElement.clientWidth - 30;
        var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 150;

        pointMapChart
          .width(w)
          .height(h/1.5);

        dc.redrawAllAsync();
      }
    })
  }

});
