/******************************************************************************
 * EXTEND: dc.mapMixin                                                        *
 * ***************************************************************************/
 
dc.mapMixin = function (_chart) {

    function zoomHandler() {
      _chart._invokeZoomedListener();
    }

    var _zoom = d3.behavior.zoom().on('zoom', zoomHandler);
    var _mouseZoomable = true;
    var _hasBeenMouseZoomable = true;

    function configureMouseZoom () {
        if (_mouseZoomable) {
            _chart._enableMouseZoom();
        }
        else if (_hasBeenMouseZoomable) {
            _chart._disableMouseZoom();
        }
    }

    _chart._enableMouseZoom = function () {
        _hasBeenMouseZoomable = true;
        _zoom.x(_chart.x())
            .scaleExtent(_zoomScale)
            .size([_chart.width(), _chart.height()])
            .duration(_chart.transitionDuration());
        _chart.root().call(_zoom);
    };

    configureMouseZoom();

    return _chart;
};

/******************************************************************************
 * END EXTEND: dc.mapMixin                                                    *
 * ***************************************************************************/
