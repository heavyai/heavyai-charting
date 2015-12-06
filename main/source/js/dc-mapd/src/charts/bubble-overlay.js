/* ****************************************************************************
 * OVERRIDE: dc.bubbleOverlay                                                 *
 * ***************************************************************************/
dc.bubbleOverlay = function (parent, chartGroup) {
    var BUBBLE_OVERLAY_CLASS = 'bubble-overlay';

/* OVERRIDE -----------------------------------------------------------------*/
    var BUBBLE_POPUP_CLASS = 'bubble-popup';
/* --------------------------------------------------------------------------*/

    var BUBBLE_NODE_CLASS = 'node';
    var BUBBLE_CLASS = 'bubble';


/* OVERRIDE -----------------------------------------------------------------*/
    var _chart = dc.bubbleMixin(dc.capMixin(dc.baseMixin({})));
/* --------------------------------------------------------------------------*/

    var _g;
    var _points = [];

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    var _colorCountUpdateCallback = null;
    var _clickCallbackFunc = null;
    var _sampling = false;

    _chart.MIN_RADIUS = 2;
    _chart.MAX_RADIUS = 10;

    _chart.scaleRadius = false;

    _chart.colorCountDictionary = {};

    _chart.clickCallback = function(_) {
      if (!arguments.length) {
        return _clickCallbackFunc;
      }
      _clickCallbackFunc = _;
      return _chart;
    }

    //_chart.transitionDuration(750);
    _chart.transitionDuration(0);
/* --------------------------------------------------------------------------*/

    _chart.radiusValueAccessor(function (d) {
        return d.value;
    });

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    _chart.r(d3.scale.sqrt());

    _chart.bounds = null;
    _chart.savedData = [];
    _chart.onColorCountUpdate = function(f) {
      if (!arguments.length) {
          return _colorCountUpdateCallback;
      }
      _colorCountUpdateCallback = f;
      return _chart;
    }

    _chart.sampling = function(setting) { // setting should be true or false
        if (!arguments.length)
            return _sampling;

        if (setting && !_sampling) // if wasn't sampling
            dc._sampledCount++;
        else if (!setting && _sampling)
            dc._sampledCount--;
        _sampling = setting;
        if (_sampling == false)
            _chart.dimension().samplingRatio(null); // unset sampling
        return _chart;
    }

    _chart.setSample = function() {
        if (_sampling) {
            if (dc._lastFilteredSize == null)
                _chart.dimension().samplingRatio(null);
            else {
                _chart.dimension().samplingRatio(Math.min(_chart.cap()/dc._lastFilteredSize, 1.0))
            }
        }
    }

    _chart.onClick = function(d) {
      if (_chart.bounds == null)
        return;
      var xPixelScale = 1.0/(_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width();
      var yPixelScale = 1.0/(_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height();
      var mapCoords = conv4326To900913([d.x,d.y]);
      var pixelPos = {x: (mapCoords[0] - _chart.bounds[0][0])*xPixelScale , y:_chart.height() - (mapCoords[1] - _chart.bounds[0][1])*yPixelScale}; 


      if (_clickCallbackFunc != null) {
        _clickCallbackFunc(d);
      }
    }
/* --------------------------------------------------------------------------*/

    _chart.point = function (name, x, y) {
        _points.push({name: name, x: x, y: y});
        return _chart;
    };

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    function conv4326To900913 (coord) {
      var transCoord = [0.0,0.0];
      transCoord[0] = coord[0] * 111319.49077777777778;
      transCoord[1] = Math.log(Math.tan((90.0 + coord[1]) * 0.00872664625997)) * 6378136.99911215736947;
      return transCoord;
    }

    _chart.setBounds = function(bounds) {
      //need to convert to 900913 from 4326
      _chart.bounds = [[0.0,0.0],[0.0,0.0]];
      _chart.bounds[0] = conv4326To900913(bounds[0]);
      _chart.bounds[1] = conv4326To900913(bounds[1]);

    }
/* --------------------------------------------------------------------------*/

    _chart._doRender = function () {
        _g = initOverlayG();

/* OVERRIDE -----------------------------------------------------------------*/
        _g.selectAll('g').remove();
        _chart.plotData();
/* --------------------------------------------------------------------------*/

        _chart.fadeDeselectedArea();

        return _chart;
    };

    function initOverlayG () {
        _g = _chart.select('g.' + BUBBLE_OVERLAY_CLASS);
        if (_g.empty()) {
            _g = _chart.svg().append('g').attr('class', BUBBLE_OVERLAY_CLASS);
        }
        return _g;
    }

/* OVERRIDE EXTEND ----------------------------------------------------------*/
    function mapDataToPoints(data) {
      if (_chart.bounds == null)
        return;
      var xPixelScale = 1.0/(_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width();
      var yPixelScale = 1.0/(_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height();
      var numPoints = data.length;
      for (var i = 0; i < numPoints; i++) {
        var coordTrans = conv4326To900913([data[i].x,data[i].y]);
        var xPixel = (coordTrans[0] - _chart.bounds[0][0])*xPixelScale ;
        var yPixel = _chart.height() - (coordTrans[1] - _chart.bounds[0][1])*yPixelScale ;
        data[i].xPixel = xPixel;
        data[i].yPixel = yPixel;
        data[i].xCoord = coordTrans[0];
        data[i].yCoord = coordTrans[1];
      }
    }

    _chart.remapPoints = function() {
      if (_chart.bounds == null)
        return;
      var xPixelScale = 1.0/(_chart.bounds[1][0] - _chart.bounds[0][0]) * _chart.width();
      var yPixelScale = 1.0/(_chart.bounds[1][1] - _chart.bounds[0][1]) * _chart.height();
      var numPoints = _chart.savedData.length;
      for (var p = 0; p < numPoints; p++) {
        _chart.savedData[p].xPixel = (_chart.savedData[p].xCoord - _chart.bounds[0][0])*xPixelScale ;
        _chart.savedData[p].yPixel = _chart.height() - (_chart.savedData[p].yCoord - _chart.bounds[0][1])*yPixelScale ;
      }
      updateBubbles();
    }


    _chart.plotData = function() {
        getData();
        var startTime = new Date();
        mapDataToPoints(_chart.savedData);
        if (_chart.scaleRadius) {
            _chart.r().domain([_chart.rMin(), _chart.rMax()]);

            _chart.r().range([_chart.MIN_RADIUS, _chart.MAX_RADIUS]);
        }
        if (!_g)
            initOverlayG();
        var bubbleG = _g.selectAll('g.'+ BUBBLE_NODE_CLASS).data(_chart.savedData, function(d) {return d.key;});

        bubbleG.enter().append('g')
            .attr('class', function (d) {return (BUBBLE_NODE_CLASS + ' ' + dc.utils.nameToId(d.key)) })
            .attr('transform', function (d) {return ('translate(' + d.xPixel + ',' + d.yPixel + ')')})
            .append('circle').attr('class', _chart.BUBBLE_CLASS)
            .attr('r', function(d) {
                return _chart.scaleRadius ? _chart.bubbleR(d) : _chart.radiusValueAccessor()(d);
            })
            .attr('fill', _chart.getColor)
            .on('click', _chart.onClick);

        bubbleG
            .attr('transform', function (d) {return ('translate(' + d.xPixel + ',' + d.yPixel + ')')})
            .attr('r', function(d) {
                return _chart.scaleRadius ? _chart.bubbleR(d) : _chart.radiusValueAccessor()(d);
            });

        bubbleG.exit().remove();
        var stopTime = new Date();
        var diff = stopTime - startTime;
    }

    function getData() {
        _chart.colorCountDictionary = {};
        _chart.savedData = _chart.data();
        _chart.savedData.forEach(function(datum) {
            if (datum.color in _chart.colorCountDictionary) {
              _chart.colorCountDictionary[datum.color]++;
            }
            else {
              _chart.colorCountDictionary[datum.color] = 1;
            }
            datum.key = _chart.keyAccessor()(datum);
        });
        if (_colorCountUpdateCallback != null) {
          _colorCountUpdateCallback(_chart.colorCountDictionary);
        }

        return _chart.savedData;
    }
/* --------------------------------------------------------------------------*/

    _chart._doRedraw = function () {

/* OVERRIDE -----------------------------------------------------------------*/
        _chart.plotData();
/* --------------------------------------------------------------------------*/

        _chart.fadeDeselectedArea();
        return _chart;
    };

    function updateBubbles () {

/* OVERRIDE -----------------------------------------------------------------*/
        if (!_g)
              return;

        var bubbleG = _g.selectAll('g.'+ BUBBLE_NODE_CLASS)
          .data(_chart.savedData, function(d) { return d.key0; });

        bubbleG
          .attr('transform', function (d) {return ('translate(' + d.xPixel + ',' + d.yPixel + ')')})
/* --------------------------------------------------------------------------*/

    }

    _chart.debug = function (flag) {
        if (flag) {
            var debugG = _chart.select('g.' + dc.constants.DEBUG_GROUP_CLASS);

            if (debugG.empty()) {
                debugG = _chart.svg()
                    .append('g')
                    .attr('class', dc.constants.DEBUG_GROUP_CLASS);
            }

            var debugText = debugG.append('text')
                .attr('x', 10)
                .attr('y', 20);

            debugG
                .append('rect')
                .attr('width', _chart.width())
                .attr('height', _chart.height())
                .on('mousemove', function () {
                    var position = d3.mouse(debugG.node());
                    var msg = position[0] + ', ' + position[1];
                    debugText.text(msg);
                });
        } else {
            _chart.selectAll('.debug').remove();
        }

        return _chart;
    };

    _chart.anchor(parent, chartGroup);

    return _chart;
};
/* ****************************************************************************
 * END OVERRIDE: dc.bubbleOverlay                                             *
 * ***************************************************************************/

