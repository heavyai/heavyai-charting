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
        // Get a table from the database
        var tableName = 'tweets_nov_feb';
        // A CrossFilter instance is used for generating the raw query strings for your MapdCon.
        var crossFilter = crossfilter.crossfilter(con, tableName)
          .then(function(cf) {
            createCharts(cf, con, tableName)
          })
        // Pass instance of crossfilter into our CreateCharts.
        ;
      });

  /*
   * This is example code that shows how to make a cross-filtered dashboard with a
   * backend-rendered scatterplot using the mapdc.js API. This example is not
   * meant to be a replacement for dc.js documentation.  For the dc.js API docs,
   * see here:
   * - https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md.
   *   For an annotated example of using dc.js - see here:
   *   https://dc-js.github.io/dc.js/docs/stock.html.
   */
  function createCharts(crossFilter, con, tableName) {
    var w = document.documentElement.clientWidth - 30;
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200;

    /*---------------------BASIC COUNT ON CROSSFILTER--------------------------*/
    /*
     *  A basic operation is getting the filtered count and total count
     *  of crossFilter. This performs that operation. It is built into DC.
     *  Note that for the count we use crossFilter itself as the dimension.
     */
    var countGroup = crossFilter.groupAll();
    var dataCount = dc.countWidget(".data-count")
      .dimension(crossFilter)
      .group(countGroup);

    /*----------------BACKEND RENDERED SCATTERPLOT EXAMPLE-----------------------*/
    var langDomain = ['en', 'pt', 'es', 'in', 'und', 'ja', 'tr', 'fr', 'tl', 'ru', 'ar', 'th', 'it', 'nl', 'sv', 'ht', 'de', 'et', 'pl', 'sl', 'ko', 'fi', 'lv', 'sk', 'uk', 'da', 'zh', 'ro', 'no', 'cy', 'iw', 'hu', 'bg', 'lt', 'bs', 'vi', 'el', 'is', 'hi', 'hr', 'fa', 'ur', 'ne', 'ta',  'sr', 'bn', 'si', 'ml', 'hy', 'lo', 'iu', 'ka', 'ps', 'te', 'pa', 'am', 'kn', 'chr', 'my', 'gu', 'ckb', 'km', 'ug', 'sd', 'bo', 'dv'];
    var langOriginColors = ["#27aeef", "#ea5545", "#87bc45", "#b33dc6", "#f46a9b", "#ede15b", "#bdcf32", "#ef9b20", "#4db6ac", "#edbf33", "#7c4dff"]
    var langColors = [];
    var scatterplotDim = crossFilter.dimension(null).projectOn(["goog_x as x", "goog_y as y", "followers as size", "lang as color"]);
    var parent = document.getElementById("chart1-example");
    mapLangColors(40);

    /*
     * We need the min/max of each dimension of the scatterplot to
     * initialize. We calculate these extents first and then
     * build the scatterplot
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

    var pointMapChart, dcTimeChart;

    crossFilter
      .groupAll()
      .reduce(extentMeasures)
      .valuesAsync(true).then(function(extents) {

      /*
       * Set the x/y axis dimensions, using the extents calculated above
       */
      var xDim = crossFilter.dimension("goog_x").filter([extents.xmin,extents.xmax]);
      var yDim = crossFilter.dimension("goog_y").filter([-8000000,8000000]);

      /* Scatterplot Point Radius Size:
       * in order to calculate the radius size.  We use d3 scale and pass in a
       * domain and range.
       *
       * To learn more about d3 scales, please read this:
       * https://github.com/d3/d3-scale
       *
       * We then pass this scale into the r function within bubbleRasterChart
       */
      var rScale = d3.scale.linear().domain([0,5000]).range([1,5]);

      var pointLayer = dc.rasterLayer("points")
                        .crossfilter(crossFilter)
                        .xDim(xDim)
                        .yDim(yDim)
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
                              range: [1, 5]
                            },
                            color: {
                              type: "ordinal",
                              field: "lang",
                              domain: langDomain,
                              range: langOriginColors
                            }
                          },
                          config: {
                            point: {
                              shape: "circle"
                            }
                          }
                        })
                        .popupColumns(['tweet_text', 'sender_name', 'tweet_time', 'lang', 'origin', 'followers'])

      pointMapChart =  dc.rasterChart(parent, false)
                          .con(con)
                          .height(h/1.5)
                          .width(w)
                          .pushLayer('points', pointLayer)
                          // render the grid lines
                          .renderHorizontalGridLines(true)
                          .renderVerticalGridLines(true)

                          // set the axis labels
                          .xAxisLabel('X Axis')
                          .yAxisLabel('Y Axis')

                          // enable the mouse/touch interactions
                          .enableInteractions(true)

                          // pixel radius for hit-testing and the columns that
                          // are shown on a hit
                          .popupSearchRadius(2)

      // custom click handler with just event data (no network calls)
      pointMapChart.map().on('mouseup', logClick)
      function logClick (result) {
        console.log("clicked!", result)
      }
      // disable with pointMapChart.map().off('mouseup', logClick)

      // custom click handler with event and nearest row data
      pointMapChart.map().on('mouseup', logClickWithData)
      function logClickWithData (event) {
        pointMapChart.getClosestResult(event.point, function(result){
          console.log(result && result.row_set[0])
        })
      }

      // hover effect with popup
      var debouncedPopup = _.debounce(displayPopupWithData, 250)
      pointMapChart.map().on('mousewheel', pointMapChart.hidePopup);
      pointMapChart.map().on('wheel', pointMapChart.hidePopup);
      pointMapChart.map().on('mousemove', pointMapChart.hidePopup);
      pointMapChart.map().on('mousemove', debouncedPopup);
      function displayPopupWithData (event) {
        pointMapChart.getClosestResult(event.point, pointMapChart.displayPopup)
      }

      /*---------------------TIME CHART EXAMPLE----------------------------------*/

      /*
       *  First we want to determine the extent (min,max) of the time variable so we
       *  can set the bounds on the time chart appropriately.
       *
       *  If you know the bounds a priori you can do this manually but here we will
       *  do it dymaically via a query sent to the backend through the crossfilter
       *  api.
       *
       *  We create a reduceMulti expression that will get the min and max of the
       *  variable dep_timestamp.
       *
       */

      var timeChartMeasures = [
      {
        expression: "tweet_time",
        agg_mode:"min",
        name: "minimum"
      },
      {
        expression: "tweet_time",
        agg_mode:"max",
        name: "maximum"}
      ]

      /* Note than when we are doing aggregations over the entire dataset we use
       * the crossfilter object itself as the dimension with the groupAll method
       *
       * values(true) gets the values for our groupAll measure (here min and max
       * of dep_timestamp) - true means to ignore currently set filters - i.e.
       * get a global min and max
       */

      crossFilter
        .groupAll()
        .reduce(timeChartMeasures)
        .valuesAsync(true).then(function(timeChartBounds) {

          var timeChartDimension = crossFilter.dimension("tweet_time");

          /* We would like to bin or histogram the time values.  We do this by
           * invoking setBinParams on the group.  Here we are asking for 288 equal
           * sized bins from the min to the max of the time range
           */

          var timeChartGroup = timeChartDimension
            .group()
            .reduceCount('*')

        /*  We create the time chart as a line chart
         *  with the following parameters:
         *
         *  Width and height - as above
         *
         *  elasticY(true) - cause the y-axis to scale as filters are changed
         *
         *  renderHorizontalGridLines(true) - add grid lines to the chart
         *
         *  brushOn(true) - Request a filter brush to be added to the chart - this
         *  will allow users to drag a filter window along the time chart and filter
         *  the rest of the data accordingly
         *
         */

          dcTimeChart = dc.lineChart('.chart2-example')
            .width(w)
            .height(h/2.5)
            .elasticY(true)
            .renderHorizontalGridLines(true)
            .brushOn(true)
            .xAxisLabel('Time of Day')
            .yAxisLabel('Number of Tweets')
            .dimension(timeChartDimension)
            .group(timeChartGroup)
            .binParams({
               numBins: 288, // 288 * 5 = number of minutes in a day
               binBounds: [timeChartBounds.minimum, timeChartBounds.maximum]
              });

          /* Set the x and y axis formatting with standard d3 functions */

          dcTimeChart
            .x(d3.time.scale.utc().domain([timeChartBounds.minimum, timeChartBounds.maximum]))
            .yAxis().ticks(5);

          dcTimeChart
            .xAxis()
            .scale(dcTimeChart.x())
            .tickFormat(dc.utils.customTimeFormat)
            .orient('bottom');


          /*---------------------SET UP FILTER ----------------------------------*/

          /*  We create the filter
           *  with the following parameters:
           *
           *  Dimension: What column you would like to search.
           *
           *  OPTIONAL: setDrillDownFilter: Boolean
           *  if set to true, your search will "AND" for all values, instead of
           *  the default "OR" for all values.
           *
           *  eg. If searching "Keyboard Cat":
           *  This will only only return results where the tweet contains:
           *  "Keyboard" AND "Cat"
           *
           */
          var searchFilterTweets = crossFilter.dimension("tweet_tokens")
                                              .setDrillDownFilter(true);

          function createMultiFilterArray(search) {

            // Empty Search
            if (search == "") {
              return undefined;
            }

            return search.split(',').map(function(searchValue) {
              return searchValue.trim();
            });
          }

          document.querySelector(".search-bar").addEventListener("keypress", function(e){
            if (e.keyCode === 13) {
              var mutipleFilterArray = createMultiFilterArray(e.target.value);
              if (mutipleFilterArray) {
                searchFilterTweets.filterMulti(mutipleFilterArray);
              } else {
                // Clears all filters
                searchFilterTweets.filter();
              }
              // You must call redrawAll after applying custom filters.
              dc.redrawAllAsync();
            }
          })

          /* Calling dc.renderAll() will render all of the charts we set up.  Any
             crossFilters applied by the user (via clicking the bar chart, scatter plot or dragging the time brush) will automagically call redraw on the charts without any intervention from us
           */

          dc.renderAllAsync()
        });
    });

    /*--------------------------RESIZE EVENT------------------------------*/

    /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */

    window.addEventListener("resize", _.debounce(reSizeAll, 500));

    function reSizeAll(){
      var w = document.documentElement.clientWidth - 30;
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200;

      pointMapChart.map().resize();
      pointMapChart.isNodeAnimate = false;
      pointMapChart
        .width(w)
        .height(h/1.5)
        .render();
      dcTimeChart
        .width(w)
        .height(h/2.5)

      dc.redrawAllAsync();
    }

    function mapLangColors(n) {
      langDomain = langDomain.slice(0, n);
      for (var i = 0; i < langDomain.length; i++) {
        langColors.push(langOriginColors[i%langOriginColors.length]);
      }
    }
  }
})
