function testProp(props, docStyle) {
    for (var i = 0; i < props.length; i++) {
        if (props[i] in docStyle) {
            return props[i];
        }
    }
}

/**
 * Coordinate Grid Raster is an abstract base chart designed to support coordinate grid based
 * chart types when the data is backend rendered.
 * @name coordinateGridRasterMixin
 * @memberof dc
 * @mixin
 * @mixes dc.colorMixin
 * @mixes dc.marginMixin
 * @mixes dc.baseMixin
 * @param {Object} _chart
 * @return {dc.coordinateGridRasterMixin}
 */
dc.coordinateGridRasterMixin = function (_chart, _mapboxgl, browser) {
    var _mapboxgl = typeof mapboxgl === 'undefined' ? _mapboxgl : mapboxgl

    var GRID_LINE_CLASS = 'grid-line';
    var HORIZONTAL_CLASS = 'horizontal';
    var VERTICAL_CLASS = 'vertical';
    var Y_AXIS_LABEL_CLASS = 'y-axis-label';
    var X_AXIS_LABEL_CLASS = 'x-axis-label';
    var DEFAULT_AXIS_LABEL_PADDING = 12;

    var _hasBeenRendered = false;
    var _scale = [1,1];
    var _offset = [0,0];
    var _currDataBounds = [[0,1],[0,1]];
    var _queryId = null;

    _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin(_chart)));
    _chart._mandatoryAttributes().push('x', 'y');

    function filterChartDimensions(chart, xrange, yrange) {
        var xdim = chart.xDim();
        var ydim = chart.yDim();

        if (xdim) {
            xdim.filter(xrange);
        }

        if (ydim) {
            ydim.filter(yrange);
        }

        if (typeof _chart.getLayers === "function") {
            _chart.getLayers().forEach(function(layer) {
                if (typeof layer.xDim === "function" &&
                    typeof layer.yDim === "function") {
                    xdim = layer.xDim();
                    ydim = layer.yDim();
                    if (xdim !== null && ydim !== null) {
                        xdim.filter(xrange);
                        ydim.filter(yrange);
                    }
                }
            });
        }
    }

    function bindEventHandlers(map, canvasContainer, enableInteractions) {

        var contextMenuEvent = null;
        var startPos = null;
        var tapped = null;
        var time;

        var wheelType;
        var lastWheelVal;
        var singularWheelTimeout, wheelTimeout;
        var startWheelPos = null;

        var dragActive = false;
        var startDragPos = null, dragPos = null;
        var dragInertia = null;

        var inertiaLinearity = 0.3,
            inertiaEasing = _mapboxgl.util.bezier(0, 0, inertiaLinearity, 1),
            inertiaMaxSpeed = 1400, // px/s
            inertiaDeceleration = 2500; // px/s^

        var boxZoomActive = false;
        var boxZoomBox = null;
        var startBoxZoomPos = null;
        var docStyle = document.documentElement.style;
        var ease = _mapboxgl.util.bezier(0.25, 0.1, 0.25, 1);
        var selectProp = testProp(['userSelect', 'MozUserSelect', 'WebkitUserSelect', 'msUserSelect'], docStyle);
        var userSelect;
        var transformProp = testProp(['transform', 'WebkitTransform'], docStyle);

        canvasContainer.addEventListener('mouseout', onMouseOut, false);
        canvasContainer.addEventListener('mousedown', onMouseDown, false);
        canvasContainer.addEventListener('mouseup', onMouseUp, false);
        canvasContainer.addEventListener('mousemove', onMouseMove, false);
        canvasContainer.addEventListener('touchstart', onTouchStart, false);
        canvasContainer.addEventListener('touchend', onTouchEnd, false);
        canvasContainer.addEventListener('touchmove', onTouchMove, false);
        canvasContainer.addEventListener('touchcancel', onTouchCancel, false);
        canvasContainer.addEventListener('click', onClick, false);
        canvasContainer.addEventListener('dblclick', onDblClick, false);

        function destroyAllEvents() {
            canvasContainer.removeEventListener('mouseout', onMouseOut);
            canvasContainer.removeEventListener('mousedown', onMouseDown);
            canvasContainer.removeEventListener('mouseup', onMouseUp);
            canvasContainer.removeEventListener('mousemove', onMouseMove);
            canvasContainer.removeEventListener('touchstart', onTouchStart);
            canvasContainer.removeEventListener('touchend', onTouchEnd);
            canvasContainer.removeEventListener('touchmove', onTouchMove);
            canvasContainer.removeEventListener('touchcancel', onTouchCancel);
            canvasContainer.removeEventListener('click', onClick);
            canvasContainer.removeEventListener('dblclick', onDblClick);
        }


        function isInChart(container, e, mousePos) {
            var width = _chart.effectiveWidth();
            var height = _chart.effectiveHeight();
            var margins = _chart.margins();
            var left = margins.left;
            var top = margins.top;
            var rect = canvasContainer.getBoundingClientRect();

            e = e.touches ? e.touches[0] : e;

            var diffX = e.clientX - left - rect.left - canvasContainer.clientLeft;
            var diffY = e.clientY - top - rect.top - canvasContainer.clientTop;

            if (mousePos) {
                mousePos.x = diffX;
                mousePos.y = diffY;
            }

            return (diffX >= 0 && diffX < width && diffY >= 0 && diffY < height);
        }

        function onMouseOut(e) {
            var pos = new _mapboxgl.Point(0,0);
            if (isInChart(canvasContainer, e, pos)) {
                fireMouseEvent('mouseout', e, pos);
            }
        }

        function onMouseDown(e) {
            // TODO(croot): if we support animated
            // pans/zooms, we want to stop any currently
            // running animation here first:

            var pos = new _mapboxgl.Point(0,0);
            if (isInChart(canvasContainer, e, pos)) {
                startPos = pos;
                fireMouseEvent('mousedown', e, pos);
            }
        }

        function onMouseUp(e) {
            var pos = new _mapboxgl.Point(0,0);
            fireMouseEvent('mouseup', e, pos);
        }

        function onMouseMove(e) {
            var pos = new _mapboxgl.Point(0,0);
            if (isInChart(canvasContainer, e, pos)) {
                if (dragActive) return;

                var target = e.toElement || e.target;
                while (target && target !== canvasContainer) target = target.parentNode;
                if (target !== canvasContainer) return;

                fireMouseEvent('mousemove', e, pos);
            }
        }

        function onTouchStart(e) {
            if (isInChart(canvasContainer, e)) {
                // TODO(croot): if we support animated
                // pans/zooms, we want to stop any currently
                // running animation here first:
                if (dragActive || boxZoomActive) return;

                fireTouchEvent('touchstart', e);

                if (!e.touches || e.touches.length > 1) return;

                if (!tapped) {
                    tapped = setTimeout(onTouchTimeout, 300);
                } else {
                    clearTimeout(tapped);
                    tapped = null;
                    fireMouseEvent('dblclick', e);
                }
            }
        }

        function onTouchMove(e) {
            if (isInChart(canvasContainer, e)) {
                fireTouchEvent('touchmove', e);
            }
        }

        function onTouchEnd(e) {
            if (isInChart(canvasContainer, e)) {
                fireTouchEvent('touchend', e);
            }
        }

        function onTouchCancel(e) {
            if (isInChart(canvasContainer, e)) {
                fireTouchEvent('touchcancel', e);
            }
        }

        function onTouchTimeout() {
            tapped = null;
        }

        function onClick(e) {
            var pos = new _mapboxgl.Point(0,0);
            if (isInChart(canvasContainer, e, pos)) {
                if (pos.equals(startPos)) {
                    fireMouseEvent('click', e, pos);
                }
            }
        }

        function onDblClick(e) {
            var pos = new _mapboxgl.Point(0,0);
            if (isInChart(canvasContainer, e, pos)) {
                fireMouseEvent('dblclick', e, pos);
                e.preventDefault();
            }
        }

        function fireMouseEvent(type, e, pos) {
            return map.fire(type, {
                dataCoord: _chart.unproject(pos),
                point: pos,
                originalEvent: e
            });
        }

        function touchPos(container, e) {
            var rect = container.getBoundingClientRect(),
                points = [];
            var margins = _chart.margins();

            for (var i = 0; i < e.touches.length; i++) {
                // TODO(croot): should we only add points that are
                // within the container?
                points.push(new _mapboxgl.Point(
                    e.touches[i].clientX - margins.left - rect.left - container.clientLeft,
                    e.touches[i].clientY - margins.top - rect.top - container.clientTop
                ));
            }
            return points;
        }

        function fireTouchEvent(type, e) {
            var touches = touchPos(canvasContainer, e);
            var singular = touches.reduce(function(prev, curr, i, arr) {
                return prev.add(curr.div(arr.length));
            }, new _mapboxgl.Point(0, 0));

            return map.fire(type, {
                dataCoord: _chart.unproject(singular),
                point: singular,
                dataCoords: touches.map(function(t) { return _chart.unproject(t); }, this),
                points: touches,
                originalEvent: e
            });
        }

        /*** Begin Zoom-related functions ***/
        function wheelZoom(doFullRender, delta, e) {
            if (!doFullRender && delta === 0) return;

            if (delta !== 0) {
                var map = _chart.map();

                // Scale by sigmoid of scroll wheel delta.
                var scale = 2 / (1 + Math.exp(-Math.abs(delta / 100)));
                if (delta < 0 && scale !== 0) scale = 1 / scale;

                scale = 1 / scale;

                var xRange = _chart.xRange(), yRange = _chart.yRange();

                if (xRange === null) {
                    xRange = [0,0];
                }

                if (yRange === null) {
                    yRange = [0,0];
                }

                var wheelData = _chart.unproject(startWheelPos);

                var xDiff = scale*(xRange[1] - xRange[0]);
                var yDiff = scale*(yRange[1] - yRange[0]);

                // we want to keep wheelData where it is in pixel space,
                // so we need to extrapolate from there to get the data bounds
                // of the window

                // NOTE: the following is currently only designed
                // to work with linear scales.

                // TODO(croot): come up with a generic extrapolation
                // technique for any scale.

                var width = _chart.effectiveWidth();
                var height = _chart.effectiveHeight();

                var xmin = wheelData.x - xDiff * (startWheelPos.x / width);
                var xmax = xmin + xDiff;

                var ymin = wheelData.y - yDiff * ((height - startWheelPos.y - 1) / height);
                var ymax = ymin + yDiff;

                var bounds = _chart._fitToMaxBounds([[xmin, ymin], [xmax, ymax]], true);
                xmin = bounds[0][0];
                ymin = bounds[0][1];
                xmax = bounds[1][0];
                ymax = bounds[1][1];

                xDiff = (xmax - xmin);
                yDiff = (ymax - ymin);

                var xBoundsDiff = _currDataBounds[0][1] - _currDataBounds[0][0];
                var yBoundsDiff = _currDataBounds[1][1] - _currDataBounds[1][0];
                var xBoundsScale = xDiff / xBoundsDiff;
                var yBoundsScale = yDiff / yBoundsDiff;

                _scale = [xBoundsScale, yBoundsScale];
                _offset = [(xmin - _currDataBounds[0][0]) / xBoundsDiff, (ymin - _currDataBounds[1][0]) / yBoundsDiff];

                filterChartDimensions(_chart, [xmin, xmax], [ymin, ymax]);
            }

            // upon zoom, elasticity is turned off
            _chart.elasticX(false);
            _chart.elasticY(false);

            if (doFullRender) {
                dc.redrawAllAsync();
            } else {
                _chart._updateXAndYScales(_chart.getDataRenderBounds());
                doChartRedraw();
            }
        }

        function onSingularWheelTimeout() {
            wheelType = 'wheel';
            wheelZoom(true, -lastWheelVal);
        }

        function onWheelTimeout() {
            wheelZoom(true, -lastWheelVal);
        }

        function onWheel(e) {
            var value;

            // make sure the mouse position is in the
            // chart
            var pos = new _mapboxgl.Point(0,0);
            if (!isInChart(canvasContainer, e, pos)) {
                return;
            }

            if (e.type === 'wheel') {
                value = e.deltaY;
                // Firefox doubles the values on retina screens...
                if (browser.isFirefox && e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) {
                    value /= (window.devicePixelRatio || 1);
                }

                if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) {
                    value *= 40;
                }
            } else if (e.type === 'mousewheel') {
                value = -e.wheelDeltaY;
                if (browser.isSafari) {
                    value = value / 3;
                }
            }

            var now = Date.now(),
                timeDelta = now - (time || 0);

            startWheelPos = pos;
            time = now;

            if (value !== 0 && (value % 4.000244140625) === 0) {
                // This one is definitely a mouse wheel event.
                wheelType = 'wheel';
                // Normalize this value to match trackpad.
                value = Math.floor(value / 4);

            } else if (value !== 0 && Math.abs(value) < 4) {
                // This one is definitely a trackpad event because it is so small.
                wheelType = 'trackpad';

            } else if (timeDelta > 400) {
                // This is likely a new scroll action.
                wheelType = null;
                lastWheelVal = value;

                // Start a timeout in case this was a singular event, and dely it by up to 40ms.
                singularWheelTimeout = setTimeout(onSingularWheelTimeout, 40);

            } else if (!wheelType) {
                // This is a repeating event, but we don't know the type of event just yet.
                // If the delta per time is small, we assume it's a fast trackpad; otherwise we switch into wheel mode.
                wheelType = (Math.abs(timeDelta * value) < 200) ? 'trackpad' : 'wheel';
            }

            // Slow down zoom if shift key is held for more precise zooming
            if (e.shiftKey && value) value = value / 4;

            // Only fire the callback if we actually know what type of scrolling device the user uses.
            if (wheelType) {
                // Make sure our delayed event isn't fired again, because we accumulate
                // the previous event (which was less than 40ms ago) into this event.
                if (singularWheelTimeout) {
                    clearTimeout(singularWheelTimeout);
                    singularWheelTimeout = null;
                    value += lastWheelVal;
                }

                lastWheelVal = value;

                if (wheelTimeout) {
                    clearTimeout(wheelTimeout);
                    wheelTimeout = null;
                }

                // Start a timeout to do a full re-render when the scrolling event
                // is finished. Set it at an arbitrary timeout - 50ms
                wheelTimeout = setTimeout(onWheelTimeout, 50);

                wheelZoom(false, -value, e);
            }

            e.preventDefault();
        }

        /*** Done Zoom-related functions ***/

        function fireEvent(map, type, e, eventMetaData) {
            if (!eventMetaData) {
                eventMetaData = {};
            }
            eventMetaData.originalEvent = e;

            return map.fire(type, eventMetaData);
        }

        /*** Begin drag-related functions ***/
        function ignoreDragEvent(e) {
            if (boxZoomActive) return true;
            if (e.touches) {
                return (e.touches.length > 1);
            } else {
                if (e.ctrlKey) return true;
                var buttons = 1,  // left button
                    button = 0;   // left button
                return (e.type === 'mousemove' ? e.buttons & buttons === 0 : e.button !== button);
            }
        }

        function drainInertiaBuffer() {
            var inertia = dragInertia,
                now = Date.now(),
                cutoff = 160;   // msec

            while (inertia.length > 0 && now - inertia[0][0] > cutoff) inertia.shift();
        }

        function onDragMove(e) {
            var map = _chart.map();

            // make sure the mouse position is in the
            // chart
            if (ignoreDragEvent(e)) return;

            var pos = new _mapboxgl.Point(0,0);
            if (!isInChart(canvasContainer, e, pos) && !dragActive) {
                return;
            }

            if (!dragActive) {
                dragActive = true;
                fireEvent(map, 'dragstart', e);
                fireEvent(map, 'movestart', e);
            }

            // TODO(croot): stop other animated pans/zooms here if/when
            // they're supported.
            drainInertiaBuffer();
            dragInertia.push([Date.now(), pos]);

            var xRange = _chart.xRange(), yRange = _chart.yRange();

            if (xRange === null) {
                xRange = [0,0];
            }

            if (yRange === null) {
                yRange = [0,0];
            }

            var prevPos = _chart.unproject(dragPos);
            var currPos = _chart.unproject(pos);

            var deltaX = currPos.x - prevPos.x;
            var deltaY = currPos.y - prevPos.y;

            var xmin = xRange[0] - deltaX;
            var xmax = xRange[1] - deltaX;

            var ymin = yRange[0] - deltaY;
            var ymax = yRange[1] - deltaY;

            var bounds = _chart._fitToMaxBounds([[xmin, ymin], [xmax, ymax]], true);
            deltaX += (xmin - bounds[0][0]);
            deltaY += (ymin - bounds[0][1]);
            xmin = bounds[0][0];
            ymin = bounds[0][1];
            xmax = bounds[1][0];
            ymax = bounds[1][1];

            var xBoundsDiff = _currDataBounds[0][1] - _currDataBounds[0][0];
            var yBoundsDiff = _currDataBounds[1][1] - _currDataBounds[1][0];

            _offset[0] -= deltaX / xBoundsDiff;
            _offset[1] -= deltaY / yBoundsDiff;

            filterChartDimensions(_chart, [xmin, xmax], [ymin, ymax]);

            // upon pan, elasticity is turned off
            _chart.elasticX(false);
            _chart.elasticY(false);

            _chart._updateXAndYScales(_chart.getDataRenderBounds());
            doChartRedraw();

            fireEvent(map, 'drag', e);
            fireEvent(map, 'move', e);

            dragPos = pos;

            e.preventDefault();
        }

        function onDragUp(e) {
            if (!dragActive) return;

            var map = _chart.map();

            dragActive = false;
            fireEvent(map, 'dragend', e);
            drainInertiaBuffer();

            var finish = function() {
                dc.redrawAllAsync();
                fireEvent(map, 'moveend', e);
            };

            var inertia = dragInertia;
            if (inertia.length < 2) {
                finish();
                return;
            }

            var last = inertia[inertia.length - 1],
                first = inertia[0],
                flingOffset = last[1].sub(first[1]),
                flingDuration = (last[0] - first[0]) / 1000;

            if (flingDuration === 0 || last[1].equals(first[1])) {
                finish();
                return;
            }

            // calculate px/s velocity & adjust for increased initial animation speed when easing out
            var velocity = flingOffset.mult(inertiaLinearity / flingDuration),
                speed = velocity.mag(); // px/s

            if (speed > inertiaMaxSpeed) {
                speed = inertiaMaxSpeed;
                velocity._unit()._mult(speed);
            }

            var duration = speed / (inertiaDeceleration * inertiaLinearity),
                offset = velocity.mult(-duration / 2);

            finish();

            // TODO(croot):
            // Do the animated ease-out of the pan like mapbox
        }

        function onDragTouchEnd(e) {
            // TODO(croot): check that the event is in the chart window?
            if (ignoreDragEvent(e)) return;
            onDragUp(e);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('touchend', onDragTouchEnd);
        }

        function onDragMouseUp(e) {
            // TODO(croot): check that the event is in the chart window?
            if (ignoreDragEvent(e)) return;
            onDragUp(e);
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragMouseUp);
        }

        function onDrag(e) {
            if (ignoreDragEvent(e)) return;

            // make sure the mouse position is in the chart
            var pos = new _mapboxgl.Point(0,0);
            if (!isInChart(canvasContainer, e, pos)) {
                return;
            }

            if (dragActive) return;

            if (e.touches) {
                document.addEventListener('touchmove', onDragMove);
                document.addEventListener('touchend', onDragTouchEnd);
            } else {
                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragMouseUp);
            }

            dragActive = false;
            startDragPos = dragPos = pos;
            dragInertia = [[Date.now(), dragPos]];
        }
        /*** Done drag-related functions ***/

        /*** Begin box-zoom-related functions ***/
        function enableDrag() {
            if (selectProp) {
                docStyle[selectProp] = userSelect;
            }
        }

        function disableDrag() {
            if (selectProp) {
                userSelect = docStyle[selectProp];
                docStyle[selectProp] = 'none';
            }
        }

        function setTransform(el, value) {
            el.style[transformProp] = value;
        };

        function createHTMLElement(tagName, className, container) {
            var el = document.createElement(tagName);
            if (className) el.className = className;
            if (container) container.appendChild(el);
            return el;
        }

        function onBoxZoomMouseMove(e) {
            var map = _chart.map();
            var p0 = startBoxZoomPos;
            var p1 = new _mapboxgl.Point(0,0);

            if (!isInChart(canvasContainer, e, p1) && !boxZoomActive) {
                return;
            }

            if (!boxZoomBox) {
                var rootNode = _chart.root().node();

                boxZoomBox = createHTMLElement('div', 'mapboxgl-boxzoom', rootNode);
                rootNode.classList.add('mapboxgl-crosshair');
                fireEvent(map, 'boxzoomstart', e);
            }

            var minX = Math.min(p0.x, p1.x),
                maxX = Math.max(p0.x, p1.x),
                minY = Math.min(p0.y, p1.y),
                maxY = Math.max(p0.y, p1.y);

            var margins = _chart.margins();

            setTransform(boxZoomBox, 'translate(' + (minX + margins.left) + 'px,' + (minY + margins.top) + 'px)');
            boxZoomBox.style.width = (maxX - minX) + 'px';
            boxZoomBox.style.height = (maxY - minY) + 'px';
        }

        function finishBoxZoom() {
            boxZoomActive = false;

            document.removeEventListener('mousemove', onBoxZoomMouseMove, false);
            document.removeEventListener('keydown', onBoxZoomKeyDown, false);
            document.removeEventListener('mouseup', onBoxZoomMouseUp, false);

            var rootNode = _chart.root().node();
            rootNode.classList.remove('mapboxgl-crosshair');

            if (boxZoomBox) {
                boxZoomBox.parentNode.removeChild(boxZoomBox);
                boxZoomBox = null;
            }

            enableDrag();
        }

        function onBoxZoomKeyDown(e) {
            var map = _chart.map();
            if (e.keyCode === 27) {
                finishBoxZoom();
                fireEvent(map, 'boxzoomcancel', e);
            }
        }

        function boxZoomPerFrameFunc(e, t, startminx, diffminx, startmaxx, diffmaxx, startminy, diffminy, startmaxy, diffmaxy) {
            var xrange = [
                startminx + t*diffminx,
                startmaxx + t*diffmaxx
            ];

            var yrange = [
                startminy + t*diffminy,
                startmaxy + t*diffmaxy
            ];


            var xDiff = (xrange[1] - xrange[0]);
            var yDiff = (yrange[1] - yrange[0]);

            var xBoundsDiff = _currDataBounds[0][1] - _currDataBounds[0][0];
            var yBoundsDiff = _currDataBounds[1][1] - _currDataBounds[1][0];
            var xBoundsScale = xDiff / xBoundsDiff;
            var yBoundsScale = yDiff / yBoundsDiff;

            _scale = [xBoundsScale, yBoundsScale];
            _offset = [(xrange[0] - _currDataBounds[0][0]) / xBoundsDiff, (yrange[0] - _currDataBounds[1][0]) / yBoundsDiff];

            filterChartDimensions(_chart, xrange, yrange);

            _chart._updateXAndYScales(_chart.getDataRenderBounds());
            doChartRedraw();

            fireEvent(map, 'move', e);
        }

        function boxZoomFinishFunc(e, map, xmin, xmax, ymin, ymax) {
            fireEvent(map, 'zoomend', e);
            fireEvent(map, 'moveend', e);

            filterChartDimensions(_chart, [xmin, xmax], [ymin, ymax]);

            // upon box zoom, elasticity is turned off
            _chart.elasticX(false);
            _chart.elasticY(false);

            var bounds = [[xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin]];

            dc.redrawAllAsync();

            boxZoomActive = false;
            fireEvent(map, 'boxzoomend', e, {boxZoomBounds: bounds});
        }

        function onBoxZoomMouseUp(e) {
            if (e.button !== 0) return;

            var map = _chart.map();
            var p0 = startBoxZoomPos;
            var p1 = new _mapboxgl.Point(0,0);
            if (!isInChart(canvasContainer, e, p1) && !boxZoomActive) {
                return;
            }

            finishBoxZoom();

            if (p0.x === p1.x && p0.y === p1.y) {
                fireEvent(map, 'boxzoomcancel', e);
            } else {
                var startPos = _chart.unproject(p0);
                var endPos = _chart.unproject(p1);

                var xmin = Math.min(startPos.x, endPos.x);
                var xmax = Math.max(startPos.x, endPos.x);

                var ymin = Math.min(startPos.y, endPos.y);
                var ymax = Math.max(startPos.y, endPos.y);

                var bounds = _chart._fitToMaxBounds([[xmin, ymin], [xmax, ymax]], true);
                xmin = bounds[0][0];
                xmax = bounds[1][0];
                ymin = bounds[0][1];
                ymax = bounds[1][1];

                fireEvent(map, 'movestart', e);
                fireEvent(map, 'zoomstart', e);

                var startminx = _currDataBounds[0][0];
                var startmaxx = _currDataBounds[0][1];
                var endminx = xmin;
                var endmaxx = xmax;

                var startminy = _currDataBounds[1][0];
                var startmaxy = _currDataBounds[1][1];
                var endminy = ymin;
                var endmaxy = ymax;

                var diffminx = endminx - startminx;
                var diffmaxx = endmaxx - startmaxx;
                var diffminy = endminy - startminy;
                var diffmaxy = endmaxy - startmaxy;

                var duration = 500;
                boxZoomActive = true;
                var abortFunc = _mapboxgl.util.browser.timed(function(t) {
                    boxZoomPerFrameFunc(e, ease(t), startminx, diffminx, startmaxx, diffmaxx, startminy, diffminy, startmaxy, diffmaxy);
                    if (t === 1) {
                        boxZoomFinishFunc(e, map, xmin, xmax, ymin, ymax);
                    }
                }, duration);
            }
        }

        function onBoxZoom(e) {
            // make sure the mouse position is in the
            // chart
            var pos = new _mapboxgl.Point(0,0);
            if (!isInChart(canvasContainer, e, pos)) {
                return;
            }

            if (!(e.shiftKey && e.button === 0)) return;

            document.addEventListener('mousemove', onBoxZoomMouseMove, false);
            document.addEventListener('keydown', onBoxZoomKeyDown, false);
            document.addEventListener('mouseup', onBoxZoomMouseUp, false);

            disableDrag();

            startBoxZoomPos = pos;
            boxZoomActive = true;
        }
        /*** Done box-zoom-related functions ***/

        var rtn = {
            enableInteractions: function() {
                canvasContainer.addEventListener('wheel', onWheel, false);
                canvasContainer.addEventListener('mousewheel', onWheel, false);

                canvasContainer.addEventListener('mousedown', onBoxZoom, false);

                // NOTE: box zoom event listeners must be set before drag
                canvasContainer.addEventListener('mousedown', onDrag, false);
                canvasContainer.addEventListener('touchstart', onDrag, false);
            },

            disableInteractions: function() {
                canvasContainer.removeEventListener('wheel', onWheel);
                canvasContainer.removeEventListener('mousewheel', onWheel);
                canvasContainer.removeEventListener('mousedown', onBoxZoom);
                canvasContainer.removeEventListener('mousedown', onDrag);
                canvasContainer.removeEventListener('touchstart', onDrag);
            },

            destroy: function() {
                destroyAllEvents();
                this.disableInteractions();
            }
        }

        if (!!enableInteractions) {
            rtn.enableInteractions();
        }

        return rtn;
    }

    var _parent;
    var _g;
    var _chartBody;
    var _gl;
    var _shaderProgram, _fragShader, _vertShader;
    var _vbo;
    var _tex;
    var _img;

    var _eventHandler;
    var _interactionsEnabled = false;

    var _xOriginalDomain;
    var _xAxis = d3.svg.axis().orient('bottom');
    var _xUnits = dc.units.integers;
    var _xAxisPadding = 0;
    var _xElasticity = false;
    var _xAxisLabel;
    var _xAxisLabelPadding = 0;
    var _lastXDomain;

    var _yAxis = d3.svg.axis().orient('left');
    var _yAxisPadding = 0;
    var _yElasticity = false;
    var _yAxisLabel;
    var _yAxisLabelPadding = 0;

    var _renderHorizontalGridLine = false;
    var _renderVerticalGridLine = false;

    var _resizing = false;

    var _unitCount;

    var _outerRangeBandPadding = 0.5;
    var _rangeBandPadding = 0;

    var _useRightYAxis = false;

    var _maxBounds = [[-Infinity, -Infinity], [Infinity, Infinity]];

    _chart._fitToMaxBounds = function(currBounds, resizeToScale) {
        var xmin = currBounds[0][0];
        var ymin = currBounds[0][1];
        var xmax = currBounds[1][0];
        var ymax = currBounds[1][1];
        var xdiff = xmax - xmin;
        var ydiff = ymax - ymin;

        var bounds_xmin = _maxBounds[0][0];
        var bounds_ymin = _maxBounds[0][1];
        var bounds_xmax = _maxBounds[1][0];
        var bounds_ymax = _maxBounds[1][1];

        var newbounds = [[Math.max(xmin, bounds_xmin), Math.max(ymin, bounds_ymin)],
                         [Math.min(xmax, bounds_xmax), Math.min(ymax, bounds_ymax)]];

        if (!!resizeToScale) {
            var newxdiff = newbounds[1][0] - newbounds[0][0];
            var newydiff = newbounds[1][1] - newbounds[0][1];

            var deltax = xdiff - newxdiff;
            var deltay = ydiff - newydiff;

            // NOTE: deltax & deltay should be >= 0
            if (deltax !== 0) {
                if (newbounds[0][0] !== bounds_xmin) {
                    newbounds[0][0] = Math.max(newbounds[0][0] - deltax, bounds_xmin);
                } else if (newbounds[1][0] !== bounds_xmax) {
                    newbounds[1][0] = Math.min(newbounds[1][0] + deltax, bounds_xmax);
                }
            }

            if (deltay !== 0) {
                if (newbounds[0][1] !== bounds_ymin) {
                    newbounds[0][1] = Math.max(newbounds[0][1] - deltay, bounds_ymin);
                } else if (newbounds[1][1] !== bounds_ymax) {
                    newbounds[1][1] = Math.min(newbounds[1][1] + deltay, bounds_ymax);
                }
            }
        }

        return newbounds;
    }

    _chart.maxBounds = function(maxBounds) {
        if (!arguments.length) {
            return _maxBounds;
        }

        // TODO(croot): verify max bounds?
        if (!(maxBounds instanceof Array) || maxBounds.length !== 2 ||
            !(maxBounds[0] instanceof Array) || maxBounds[0].length !== 2 ||
            !(maxBounds[1] instanceof Array) || maxBounds[1].length !== 2) {
            throw new Error("Invalid bounds argument. A bounds object should be: [[xmin, ymin], [xmax, ymax]]")
        }

        _maxBounds = [[Math.min(maxBounds[0][0], maxBounds[1][0]), Math.min(maxBounds[0][1], maxBounds[1][1])],
                      [Math.max(maxBounds[0][0], maxBounds[1][0]), Math.max(maxBounds[0][1], maxBounds[1][1])]];

        return _chart;
    }

    _chart.unproject = function(pt) {
        var xscale = _chart.x(),
            yscale = _chart.y();
        var x = (xscale ? xscale.invert(pt.x) : 0);
        var y = (yscale ? yscale.invert(pt.y) : 0);
        return new _mapboxgl.Point(x, y);
    };

    _chart.enableInteractions = function (enableInteractions) {
        if (!arguments.length) {
            return _interactionsEnabled;
        }

        if (enableInteractions !== _interactionsEnabled) {
            if (_eventHandler) {
                if (!!enableInteractions) {
                    // handle events
                    _eventHandler.enableInteractions();
                } else {
                    // disable events
                    _eventHandler.disableInteractions();
                }
            }
            _interactionsEnabled = !!enableInteractions;
        }

        return _chart;
    };

    /**
     * When changing the domain of the x or y scale, it is necessary to tell the chart to recalculate
     * and redraw the axes. (`.rescale()` is called automatically when the x or y scale is replaced
     * with {@link #dc.coordinateGridRasterMixin+x .x()} or {@link #dc.coordinateGridRasterMixin+y .y()}, and has
     * no effect on elastic scales.)
     * @name rescale
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.rescale = function () {
        _unitCount = undefined;
        _resizing = true;
        return _chart;
    };

    _chart.resizing = function () {
        return _resizing;
    };

    function initWebGL(canvas) {
        var webglAttrs = {
            alpha: true,
            antialias: true,
            // premultipliedAlpha: false,
            depth: false,
            stencil: false,
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false
        }
        _gl = canvas.getContext('webgl', webglAttrs) || canvas.getContext('experimental-webgl', webglAttrs);

        var vertShaderSrc = "" +
"precision mediump float;\n" +
"attribute vec2 a_pos;\n" +
"attribute vec2 a_texCoords;\n" +
"\n" +
"varying vec2 v_texCoords;\n" +
"uniform vec2 u_texCoordsScale;\n" +
"uniform vec2 u_texCoordsOffset;\n" +
"\n" +
"void main(void) {\n" +
"    gl_Position = vec4(a_pos, 0, 1);\n" +
"\n" +
"    v_texCoords = u_texCoordsScale * a_texCoords + u_texCoordsOffset;\n" +
// NOTE: right now it seems that unpacking the base64 array via the
// createImageBitmap() call puts pixel 0,0 in the upper left-hand
// corner rather than the lower left-hand corner in the way that
// webgl expects, so flipping the y texture coords below.
// If another way of extracing the base64 image data is done
// that doesn't flip the image, then flip the y tex coords
"    v_texCoords.y = (1.0 - v_texCoords.y);\n" +
"}";

        var fragShaderSrc = "" +
"precision mediump float;\n" +
"\n" +
"uniform sampler2D u_sampler;\n" +
"\n" +
"varying vec2 v_texCoords;\n" +
"\n" +
"void main() {\n" +
"    if (v_texCoords[0] >= 0.0 && v_texCoords[0] <= 1.0 &&\n" +
"        v_texCoords[1] >= 0.0 && v_texCoords[1] <= 1.0) {\n" +
"        gl_FragColor = texture2D(u_sampler, v_texCoords);\n" +
"    }\n" +
"}";

        var gl = _gl;

        var program = _shaderProgram = gl.createProgram();

        var fragShader = _fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, fragShaderSrc);
        gl.compileShader(fragShader);
        if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
            throw new Error("Error compiling fragment shader: " + gl.getShaderInfoLog(fragShader));
        }
        gl.attachShader(program, fragShader);

        var vertShader = _vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertShaderSrc);
        gl.compileShader(vertShader);
        if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
            throw new Error("Error compiling vertex shader: " + gl.getShaderInfoLog(vertShader));
        }
        gl.attachShader(program, vertShader);

        gl.linkProgram(program);
        gl.validateProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Error linking shader program: " + gl.getProgramInfoLog(program));
        }

        program.a_pos = gl.getAttribLocation(program, "a_pos");
        program.a_texCoords = gl.getAttribLocation(program, "a_texCoords");
        gl.enableVertexAttribArray(program.a_pos);
        gl.enableVertexAttribArray(program.a_texCoords);

        program.u_texCoordsScale = gl.getUniformLocation(program, 'u_texCoordsScale');
        program.u_texCoordsOffset = gl.getUniformLocation(program, 'u_texCoordsOffset');
        program.u_sampler = gl.getUniformLocation(program, "u_sampler");

        gl.useProgram(program);

        var vbo = _vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        var vertData = [-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]; // unflipped

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertData), gl.STATIC_DRAW);
        gl.vertexAttribPointer(_shaderProgram.a_pos, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(_shaderProgram.a_texCoords, 2, gl.FLOAT, false, 16, 8);

        createGLTexture();
    }

    function destroy() {
        destroyWebGL();

        if (_eventHandler) {
            _eventHandler.destroy();
        }
        _eventHandler = null;

        if (_chartBody && _chartBody.parentNode) {
            _chartBody.parentNode.removeChild(node);
        }

        _chartBody = null;
    }

    function destroyWebGL() {
        var gl = _gl;

        gl.deleteProgram(_shaderProgram);
        gl.deleteShader(_fragShader);
        gl.deleteShader(_vertShader);
        gl.deleteBuffer(_vbo);

        _shaderProgram = _fragShader = _vertShader = _vbo = 0;

        removeGLTexture();
    }

    function createGLTexture() {
        if (!_tex) {
            var gl = _gl;

            // use cyan as the default color.
            var initialColor = new Uint8Array([0,0,0,0]);

            // make a texture with 1x1 pixels so we can use the texture immediately
            // while we wait for the image to load
            var tex = _tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                          gl.RGBA, gl.UNSIGNED_BYTE, initialColor);
        }
    }

    function removeGLTexture() {
        if (_tex) {
            _gl.deleteTexture(_tex);
            _tex = 0;
        }

        // destroy our image cache
        _img = null;
    }

    _chart._removeOverlay = function() {
        removeGLTexture();
    }


    _chart._generateG = function (parent) {
        if (parent === undefined) {
            parent = _chart.svg();
        }

        var reset = (parent !== _parent);
        _parent = parent;

        if (!_g || reset) {
            _g = _parent.append('g');
        }

        if (!_chartBody) {
            var root = _chart.root();

            _chartBody = root.append('canvas')
                             .attr('class', 'webgl-canvas')
                             .style('position', 'absolute')
                             .style('z-index', -1); // force the webgl canvas to draw behind the svg

            var containerNode = root.node();
            var chartNode = _chartBody.node();

            initWebGL(chartNode);
            _eventHandler = bindEventHandlers(_chart.map(), containerNode, _interactionsEnabled);
        } else if (reset) {
            var root = _chart.root().node();
            var node = _chartBody.node();
            root.appendChild(node);
        }

        return _g;
    };

    /**
     * Get or set the root g element. This method is usually used to retrieve the g element in order to
     * overlay custom svg drawing programatically. **Caution**: The root g element is usually generated
     * by dc.js internals, and resetting it might produce unpredictable result.
     * @name g
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {SVGElement} [gElement]
     * @return {SVGElement}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.g = function (gElement) {
        if (!arguments.length) {
            return _g;
        }
        _g = gElement;
        return _chart;
    };

    /**
     * Retrieve the canvas for the chart body.
     * @param {SVGElement} [chartBody]
     * @return {SVGElement}
     */
    _chart.chartBody = function (chartBody) {
        return _chartBody;
    };

    _chart.xOriginalDomain = function () {
        return _xOriginalDomain;
    };

    /**
     * Set or get the xUnits function. The coordinate grid chart uses the xUnits function to calculate
     * the number of data projections on x axis such as the number of bars for a bar chart or the
     * number of dots for a line chart. This function is expected to return a Javascript array of all
     * data points on x axis, or the number of points on the axis. [d3 time range functions
     * d3.time.days, d3.time.months, and
     * d3.time.years](https://github.com/mbostock/d3/wiki/Time-Intervals#aliases) are all valid xUnits
     * function. dc.js also provides a few units function, see the {@link #utilities Utilities} section for
     * a list of built-in units functions. The default xUnits function is dc.units.integers.
     * @name xUnits
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @todo Add docs for utilities
     * @example
     * // set x units to count days
     * chart.xUnits(d3.time.days);
     * // set x units to count months
     * chart.xUnits(d3.time.months);
     *
     * // A custom xUnits function can be used as long as it follows the following interface:
     * // units in integer
     * function(start, end, xDomain) {
     *      // simply calculates how many integers in the domain
     *      return Math.abs(end - start);
     * };
     *
     * // fixed units
     * function(start, end, xDomain) {
     *      // be aware using fixed units will disable the focus/zoom ability on the chart
     *      return 1000;
     * };
     * @param {Function} [xUnits]
     * @return {Function}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.xUnits = function (xUnits) {
        if (!arguments.length) {
            return _xUnits;
        }
        _xUnits = xUnits;
        return _chart;
    };

    /**
     * Set or get the x axis used by a particular coordinate grid chart instance. This function is most
     * useful when x axis customization is required. The x axis in dc.js is an instance of a [d3
     * axis object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis); therefore it supports any
     * valid d3 axis manipulation. **Caution**: The x axis is usually generated internally by dc;
     * resetting it may cause unexpected results.
     * @name xAxis
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
     * @example
     * // customize x axis tick format
     * chart.xAxis().tickFormat(function(v) {return v + '%';});
     * // customize x axis tick values
     * chart.xAxis().tickValues([0, 100, 200, 300]);
     * @param {d3.svg.axis} [xAxis=d3.svg.axis().orient('bottom')]
     * @return {d3.svg.axis}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.xAxis = function (xAxis) {
        if (!arguments.length) {
            return _xAxis;
        }
        _xAxis = xAxis;
        return _chart;
    };

    /**
     * Turn on/off elastic x axis behavior. If x axis elasticity is turned on, then the grid chart will
     * attempt to recalculate the x axis range whenever a redraw event is triggered.
     * @name elasticX
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Boolean} [elasticX=false]
     * @return {Boolean}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.elasticX = function (elasticX) {
        if (!arguments.length) {
            return _xElasticity;
        }
        _xElasticity = elasticX;
        return _chart;
    };

    /**
     * Set or get x axis padding for the elastic x axis. The padding will be added to both end of the x
     * axis if elasticX is turned on; otherwise it is ignored.
     *
     * padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
     * number or date x axes.  When padding a date axis, an integer represents number of days being padded
     * and a percentage string will be treated the same as an integer.
     * @name xAxisPadding
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Number|String} [padding=0]
     * @return {Number|String}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.xAxisPadding = function (padding) {
        if (!arguments.length) {
            return _xAxisPadding;
        }
        _xAxisPadding = padding;
        return _chart;
    };

    /**
     * Returns the number of units displayed on the x axis using the unit measure configured by
     * .xUnits.
     * @name xUnitCount
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @return {Number}
     */
    _chart.xUnitCount = function () {
        if (_unitCount === undefined) {
            var units = _chart.xUnits()(_chart.x().domain()[0], _chart.x().domain()[1], _chart.x().domain());

            if (units instanceof Array) {
                _unitCount = units.length;
            } else {
                _unitCount = units;
            }
        }

        return _unitCount;
    };

    /**
     * Gets or sets whether the chart should be drawn with a right axis instead of a left axis. When
     * used with a chart in a composite chart, allows both left and right Y axes to be shown on a
     * chart.
     * @name useRightYAxis
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Boolean} [useRightYAxis=false]
     * @return {Boolean}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.useRightYAxis = function (useRightYAxis) {
        if (!arguments.length) {
            return _useRightYAxis;
        }
        _useRightYAxis = useRightYAxis;
        return _chart;
    };

    /**
     * Returns true if the chart is using ordinal xUnits ({@link #dc.units.ordinal dc.units.ordinal}, or false
     * otherwise. Most charts behave differently with ordinal data and use the result of this method to
     * trigger the appropriate logic.
     * @name isOrdinal
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @return {Boolean}
     */
    _chart.isOrdinal = function () {
        return _chart.xUnits() === dc.units.ordinal;
    };

    _chart._useOuterPadding = function () {
        return true;
    };

    function compareDomains (d1, d2) {
        return !d1 || !d2 || d1.length !== d2.length ||
            d1.some(function (elem, i) { return (elem && d2[i]) ? elem.toString() !== d2[i].toString() : elem === d2[i]; });
    }

    function prepareChartBody() {
        var width = _chart.effectiveWidth();
        var height = _chart.effectiveHeight();
        var margins = _chart.margins();
        var left = margins.left;
        var top = margins.top;

        var pixelRatio = window.devicePixelRatio || 1;

        // set the actual canvas size, taking pixel ratio into account
        _chartBody.style('width', width + 'px')
                  .style('height', height + 'px')
                  .style('left', left + 'px')
                  .style('top', top + 'px')
                  .attr('width', width * pixelRatio)
                  .attr('height', height * pixelRatio);
    }

    function renderChart(imgUrl, renderBounds, queryId) {
        var gl = _gl;

        if (imgUrl) { // should we check to see if the imgUrl is the same from the previous render?
            _mapboxgl.util.getImage(imgUrl, function(err, img) {
                if (queryId === _queryId) {
                    var xdom = _chart.x().domain();
                    var ydom = _chart.y().domain();

                    if (xdom[0] === renderBounds[0][0] && xdom[1] === renderBounds[1][0] &&
                        ydom[0] === renderBounds[2][1] && ydom[1] === renderBounds[0][1]) {

                        if (!_tex) {
                            createGLTexture();
                        }

                        if (!_img || img.width != _img.width ||
                                     img.height != _img.height) {
                            // Image was updated and dimensions changed.
                            gl.bindTexture(gl.TEXTURE_2D, _tex);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

                            if (!_img) {
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            }
                        } else {
                            // Image was updated but dimensions unchanged.
                            gl.bindTexture(gl.TEXTURE_2D, _tex);
                            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
                        }
                        _img = img;

                        _scale = [1,1];
                        _offset = [0,0];
                        var xrange = _chart.xRange();
                        var yrange = _chart.yRange();
                        _currDataBounds[0][0] = xrange[0];
                        _currDataBounds[0][1] = xrange[1];
                        _currDataBounds[1][0] = yrange[0];
                        _currDataBounds[1][1] = yrange[1];

                        renderChart();
                    }
                }
            });
        }

        if (queryId !== null && queryId !== undefined) _queryId = queryId;

        var pixelRatio = window.devicePixelRatio || 1;
        gl.viewport(0, 0, _chart.effectiveWidth() * pixelRatio, _chart.effectiveHeight() * pixelRatio);

        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);

        gl.useProgram(_shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);

        gl.uniform2fv(_shaderProgram.u_texCoordsScale, _scale);
        gl.uniform2fv(_shaderProgram.u_texCoordsOffset, _offset);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _tex);
        gl.uniform1i(_shaderProgram.u_sampler, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function prepareXAxis (g, x, render, transitionDuration) {
        // has the domain changed?
        var xdom = x.domain();
        if (render || compareDomains(_lastXDomain, xdom)) {
            _chart.rescale();
        }
        _lastXDomain = xdom;

        // TODO(croot): support ordinal scales?
        // If BE supports ordinal scales for X axis, use
        // rangeBands here: i.e. x.rangeBands([0, _chart.xAxisLength()], ...)

        // currently only supports quantitative scales
        x.range([0, Math.round(_chart.xAxisLength())]);

        var customTimeFormat = d3.time.format.utc.multi([
          [".%L", function(d) { return d.getUTCMilliseconds(); }],
          [":%S", function(d) { return d.getUTCSeconds(); }],
          ["%I:%M", function(d) { return d.getUTCMinutes(); }],
          ["%I %p", function(d) { return d.getUTCHours(); }],
          ["%a %d", function(d) { return d.getUTCDay() && d.getUTCDate() != 1; }],
          ["%b %d", function(d) { return d.getUTCDate() != 1; }],
          ["%b", function(d) { return d.getUTCMonth(); }],
          ["%Y", function() { return true; }]
        ]);

        _xAxis = _xAxis.scale(x).tickFormat( xdom[0] instanceof Date ? customTimeFormat : null);

        _xAxis.ticks( _chart.effectiveWidth()/_xAxis.scale().ticks().length < 64 ? Math.ceil(_chart.effectiveWidth()/64) : 10);


        renderVerticalGridLines(g, x, transitionDuration);
    }

    _chart.renderXAxis = function (g, transitionDuration) {
        var axisXG = g.selectAll('g.x');

        if (axisXG.empty()) {
            axisXG = g.append('g')
                .attr('class', 'axis x')
                .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart._xAxisY() + ')');
        }

        var root = _chart.root();
        var xLabel = root.selectAll('.x-axis-label');

        if (xLabel.empty()) {
            xLabel = root.append('div')
            .attr('class', 'x-axis-label');
        }

        xLabel
            .style('left', (_chart.effectiveWidth()/2 + _chart.margins().left) +'px')
            .text(_chart.xAxisLabel());


        if (transitionDuration === undefined) {
            transitionDuration = _chart.transitionDuration();
        }
        dc.transition(axisXG, transitionDuration)
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart._xAxisY() + ')')
            .call(_xAxis);
    };

    function renderVerticalGridLines (g, x, transitionDuration) {
        var gridLineG = g.selectAll('g.' + VERTICAL_CLASS);

        if (_renderVerticalGridLine) {
            if (gridLineG.empty()) {
                gridLineG = g.insert('g', ':first-child')
                    .attr('class', GRID_LINE_CLASS + ' ' + VERTICAL_CLASS)
                    .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');
            }

            var ticks = _xAxis.tickValues() ? _xAxis.tickValues() :
                    (typeof x.ticks === 'function' ? x.ticks(_xAxis.ticks()[0]) : x.domain());

            var lines = gridLineG.selectAll('line')
                .data(ticks);

            // enter
            var linesGEnter = lines.enter()
                .append('line')
                .attr('x1', function (d) {
                    return x(d);
                })
                .attr('y1', _chart._xAxisY() - _chart.margins().top)
                .attr('x2', function (d) {
                    return x(d);
                })
                .attr('y2', 0)
                .attr('opacity', 0);

            if (transitionDuration === undefined) {
                transitionDuration = _chart.transitionDuration();
            }

            dc.transition(linesGEnter, transitionDuration)
                .attr('opacity', 1);

            // update
            dc.transition(lines, transitionDuration)
                .attr('x1', function (d) {
                    return x(d);
                })
                .attr('y1', _chart._xAxisY() - _chart.margins().top)
                .attr('x2', function (d) {
                    return x(d);
                })
                .attr('y2', 0);

            // exit
            lines.exit().remove();
        } else {
            gridLineG.selectAll('line').remove();
        }
    }

    _chart._xAxisY = function () {
        return (_chart.height() - _chart.margins().bottom);
    };

    _chart.xAxisLength = function () {
        return _chart.effectiveWidth();
    };

    /**
     * Set or get the x axis label. If setting the label, you may optionally include additional padding to
     * the margin to make room for the label. By default the padded is set to 12 to accomodate the text height.
     * @name xAxisLabel
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {String} [labelText]
     * @param {Number} [padding=12]
     * @return {String}
     */
    _chart.xAxisLabel = function (labelText, padding) {
        if (!arguments.length) {
            return _xAxisLabel;
        }
        _xAxisLabel = labelText;
        _chart.margins().bottom -= _xAxisLabelPadding;
        _xAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding;
        _chart.margins().bottom += _xAxisLabelPadding;
        return _chart;
    };

    _chart._prepareYAxis = function (g, y, transitionDuration) {
        y.range([Math.round(_chart.yAxisHeight()), 0]);

        _yAxis = _yAxis.scale(y);

        _yAxis.ticks(_chart.effectiveHeight()/_yAxis.scale().ticks().length < 16 ?  Math.ceil(_chart.effectiveHeight()/16) : 10);

        if (_useRightYAxis) {
            _yAxis.orient('right');
        }

        _chart._renderHorizontalGridLinesForAxis(g, y, _yAxis, transitionDuration);
    };

    _chart.renderYAxisLabel = function (axisClass, text, rotation, labelXPosition) {
        var root = _chart.root();

        var yLabel = root.selectAll('.y-axis-label');

        if (yLabel.empty()) {
            yLabel = root.append('div')
            .attr('class', 'y-axis-label');
        }

        if (text !== '') {
            // TODO(croot): should add the rotation and labelXPosition here
            // As of now (09/02/2016) the chart.css is breaking this.

            var yOffset = 0;

            yLabel
                .style('top', ((_chart.effectiveHeight() + yOffset) / 2 + _chart.margins().top) +'px')
                .text(text);
        }
    };

    _chart.renderYAxisAt = function (axisClass, axis, position, transitionDuration) {
        var axisYG = _chart.g().selectAll('g.' + axisClass);
        if (axisYG.empty()) {
            axisYG = _chart.g().append('g')
                .attr('class', 'axis ' + axisClass)
                .attr('transform', 'translate(' + position + ',' + _chart.margins().top + ')');
        }

        if (transitionDuration === undefined) {
            transitionDuration = _chart.transitionDuration();
        }

        dc.transition(axisYG, transitionDuration)
            .attr('transform', 'translate(' + position + ',' + _chart.margins().top + ')')
            .call(axis);
    };

    _chart.renderYAxis = function (g, transitionDuration) {
        var axisPosition = _useRightYAxis ? (_chart.width() - _chart.margins().right) : _chart._yAxisX();
        _chart.renderYAxisAt('y', _yAxis, axisPosition, transitionDuration);
        var labelPosition = _useRightYAxis ? (_chart.width() - _yAxisLabelPadding) : _yAxisLabelPadding;
        var rotation = _useRightYAxis ? 90 : -90;
        _chart.renderYAxisLabel('y', _chart.yAxisLabel(), rotation, labelPosition);
    };

    _chart._renderHorizontalGridLinesForAxis = function (g, scale, axis, transitionDuration) {
        var gridLineG = g.selectAll('g.' + HORIZONTAL_CLASS);

        if (_renderHorizontalGridLine) {
            var ticks = axis.tickValues() ? axis.tickValues() : scale.ticks(axis.ticks()[0]);

            if (gridLineG.empty()) {
                gridLineG = g.insert('g', ':first-child')
                    .attr('class', GRID_LINE_CLASS + ' ' + HORIZONTAL_CLASS)
                    .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');
            }

            var lines = gridLineG.selectAll('line')
                .data(ticks);

            // enter
            var linesGEnter = lines.enter()
                .append('line')
                .attr('x1', 1)
                .attr('y1', function (d) {
                    return scale(d);
                })
                .attr('x2', _chart.xAxisLength())
                .attr('y2', function (d) {
                    return scale(d);
                })
                .attr('opacity', 0);

            if (transitionDuration === undefined) {
                transitionDuration = _chart.transitionDuration();
            }

            dc.transition(linesGEnter, transitionDuration)
                .attr('opacity', 1);

            // update
            dc.transition(lines, transitionDuration)
                .attr('x1', 1)
                .attr('y1', function (d) {
                    return scale(d);
                })
                .attr('x2', _chart.xAxisLength())
                .attr('y2', function (d) {
                    return scale(d);
                });

            // exit
            lines.exit().remove();
        } else {
            gridLineG.selectAll('line').remove();
        }
    };

    _chart._yAxisX = function () {
        return _chart.useRightYAxis() ? _chart.width() - _chart.margins().right : _chart.margins().left;
    };

    /**
     * Set or get the y axis label. If setting the label, you may optionally include additional padding
     * to the margin to make room for the label. By default the padded is set to 12 to accomodate the
     * text height.
     * @name yAxisLabel
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {String} [labelText]
     * @param {Number} [padding=12]
     * @return {String}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.yAxisLabel = function (labelText, padding) {
        if (!arguments.length) {
            return _yAxisLabel;
        }
        _yAxisLabel = labelText;
        _chart.margins().left -= _yAxisLabelPadding;
        _yAxisLabelPadding = (padding === undefined) ? DEFAULT_AXIS_LABEL_PADDING : padding;
        _chart.margins().left += _yAxisLabelPadding;
        return _chart;
    };

    /**
     * Set or get the y axis used by the coordinate grid chart instance. This function is most useful
     * when y axis customization is required. The y axis in dc.js is simply an instance of a [d3 axis
     * object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-_axis); therefore it supports any
     * valid d3 axis manipulation. **Caution**: The y axis is usually generated internally by dc;
     * resetting it may cause unexpected results.
     * @name yAxis
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @see {@link http://github.com/mbostock/d3/wiki/SVG-Axes d3.svg.axis}
     * @example
     * // customize y axis tick format
     * chart.yAxis().tickFormat(function(v) {return v + '%';});
     * // customize y axis tick values
     * chart.yAxis().tickValues([0, 100, 200, 300]);
     * @param {d3.svg.axis} [yAxis=d3.svg.axis().orient('left')]
     * @return {d3.svg.axis}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.yAxis = function (yAxis) {
        if (!arguments.length) {
            return _yAxis;
        }
        _yAxis = yAxis;
        return _chart;
    };

    /**
     * Turn on/off elastic y axis behavior. If y axis elasticity is turned on, then the grid chart will
     * attempt to recalculate the y axis range whenever a redraw event is triggered.
     * @name elasticY
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Boolean} [elasticY=false]
     * @return {Boolean}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.elasticY = function (elasticY) {
        if (!arguments.length) {
            return _yElasticity;
        }
        _yElasticity = elasticY;
        return _chart;
    };

    /**
     * Turn on/off horizontal grid lines.
     * @name renderHorizontalGridLines
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Boolean} [renderHorizontalGridLines=false]
     * @return {Boolean}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.renderHorizontalGridLines = function (renderHorizontalGridLines) {
        if (!arguments.length) {
            return _renderHorizontalGridLine;
        }
        _renderHorizontalGridLine = renderHorizontalGridLines;
        return _chart;
    };

    /**
     * Turn on/off vertical grid lines.
     * @name renderVerticalGridLines
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Boolean} [renderVerticalGridLines=false]
     * @return {Boolean}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.renderVerticalGridLines = function (renderVerticalGridLines) {
        if (!arguments.length) {
            return _renderVerticalGridLine;
        }
        _renderVerticalGridLine = renderVerticalGridLines;
        return _chart;
    };

    /**
     * Set or get y axis padding for the elastic y axis. The padding will be added to the top of the y
     * axis if elasticY is turned on; otherwise it is ignored.
     *
     * padding can be an integer or percentage in string (e.g. '10%'). Padding can be applied to
     * number or date axes. When padding a date axis, an integer represents number of days being padded
     * and a percentage string will be treated the same as an integer.
     * @name yAxisPadding
     * @memberof dc.coordinateGridRasterMixin
     * @instance
     * @param {Number|String} [padding=0]
     * @return {Number}
     * @return {dc.coordinateGridRasterMixin}
     */
    _chart.yAxisPadding = function (padding) {
        if (!arguments.length) {
            return _yAxisPadding;
        }
        _yAxisPadding = padding;
        return _chart;
    };

    _chart.yAxisHeight = function () {
        return _chart.effectiveHeight();
    };

    _chart._rangeBandPadding = function (_) {
        if (!arguments.length) {
            return _rangeBandPadding;
        }
        _rangeBandPadding = _;
        return _chart;
    };

    _chart._outerRangeBandPadding = function (_) {
        if (!arguments.length) {
            return _outerRangeBandPadding;
        }
        _outerRangeBandPadding = _;
        return _chart;
    };

    dc.override(_chart, 'filter', function (filter, isInverseFilter) {
        if (!arguments.length) {
            return _chart._filter();
        }

        _chart._filter(filter, isInverseFilter);

        if (filter) {
            _chart.brush().extent(filter);
        } else {
            _chart.brush().clear();
        }

        return _chart;
    });

    _chart.brush = function (_) {
        if (!arguments.length) {
            return _brush;
        }
        _brush = _;
        return _chart;
    };

    _chart.isBrushing = function (_) {
        if (!arguments.length) {
            return _isBrushing;
        }
        _isBrushing = _;
        return _chart;
    };

    function brushHeight () {
        return _chart._xAxisY() - _chart.margins().top;
    }

    _chart.fadeDeselectedArea = function () {
        // do nothing, sub-chart should override this function
    };

    // borrowed from Crossfilter example
    _chart.resizeHandlePath = function (d) {
        var e = +(d === 'e'), x = e ? 1 : -1, y = brushHeight() / 3;
        return 'M' + (0.5 * x) + ',' + y +
            'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6) +
            'V' + (2 * y - 6) +
            'A6,6 0 0 ' + e + ' ' + (0.5 * x) + ',' + (2 * y) +
            'Z' +
            'M' + (2.5 * x) + ',' + (y + 8) +
            'V' + (2 * y - 8) +
            'M' + (4.5 * x) + ',' + (y + 8) +
            'V' + (2 * y - 8);
    };

    function getClipPathId () {
        return _chart.anchorName().replace(/[ .#=\[\]]/g, '-') + '-clip';
    }

    _chart._preprocessData = function () {};

    function doChartRender(imgUrl, renderBounds, queryId) {
        _chart.resetSvg();

        _chart._preprocessData();

        _chart._generateG();

        drawChart(true, imgUrl, renderBounds, queryId);

        _hasBeenRendered = true;

        return _chart;
    }

    _chart._doRender = function () {
        doChartRender();
    };


    function doChartRedraw(imgUrl, renderBounds, queryId) {
        if (!_hasBeenRendered) // guard to prevent a redraw before a render
            return doChartRender(imgUrl, renderBounds, queryId);

        _chart._preprocessData();

        drawChart(false, imgUrl, renderBounds, queryId);

        return _chart;
    }

    _chart._doRedraw = function () {
        doChartRedraw();
    };

    _chart._drawScatterPlot = function(doFullRender, imgUrl, renderBounds, queryId) {
        if (!!doFullRender) {
            doChartRender(imgUrl, renderBounds, queryId);
        } else {
            doChartRedraw(imgUrl, renderBounds, queryId);
        }
    }

    _chart._destroyScatterPlot = function() {
        destroy();
    }

    function drawChart (render, imgUrl, renderBounds, queryId) {
        // prepare and render the chart first so the grid lines/axes
        // are drawn on top
        prepareChartBody();
        renderChart(imgUrl, renderBounds, queryId);

        var transitionDuration = (render ? _chart.transitionDuration() : 10);

        prepareXAxis(_chart.g(), _chart.x(), render, transitionDuration);
        _chart._prepareYAxis(_chart.g(), _chart.y(), transitionDuration);

        if (_chart.elasticX() || _resizing || render) {
            _chart.renderXAxis(_chart.g(), transitionDuration);
        }

        if (_chart.elasticY() || _resizing || render) {
            _chart.renderYAxis(_chart.g(), transitionDuration);
        }

        _chart.fadeDeselectedArea();
        _resizing = false;
    }

    return _chart;
};
