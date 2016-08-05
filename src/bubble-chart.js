/**
 * A concrete implementation of a general purpose bubble chart that allows data visualization using the
 * following dimensions:
 * - x axis position
 * - y axis position
 * - bubble radius
 * - color
 * Examples:
 * - {@link http://dc-js.github.com/dc.js/ Nasdaq 100 Index}
 * - {@link http://dc-js.github.com/dc.js/vc/index.html US Venture Capital Landscape 2011}
 * @name bubbleChart
 * @memberof dc
 * @mixes dc.bubbleMixin
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a bubble chart under #chart-container1 element using the default global chart group
 * var bubbleChart1 = dc.bubbleChart('#chart-container1');
 * // create a bubble chart under #chart-container2 element using chart group A
 * var bubbleChart2 = dc.bubbleChart('#chart-container2', 'chartGroupA');
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/mbostock/d3/wiki/Selections#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @return {dc.bubbleChart}
 */
dc.bubbleChart = function (parent, chartGroup) {

/* OVERRIDE -----------------------------------------------------------------*/
    var _chart = dc.bubbleMixin(dc.capMixin(dc.coordinateGridMixin({})));
    var _popupHeader = [];
    var _isHoverNode = null;
/* --------------------------------------------------------------------------*/
    
    var _elasticRadius = false;
    var _sortBubbleSize = false;

    _chart.transitionDuration(750);

    var bubbleLocator = function (d) {
        return 'translate(' + (bubbleX(d)) + ',' + (bubbleY(d)) + ')';
    };

/* OVERRIDE -----------------------------------------------------------------*/
    _chart.setPopupHeader = function (_) {
        if (!arguments.length) {
            return _popupHeader;
        }
        _popupHeader = _;
        return _chart;
    };

    _chart.hideOverlappedLabels = function (){

        var nodes = _chart.svg().selectAll('.node');

        var labelHeight = 10;
        var letterWidth = 5;

        nodes[0].reverse();
        
        nodes
            .classed('hide-label', function(d){
                return _chart.bubbleR(d) < _chart.minRadiusWithLabel();
            })
            .each(function(d, i){

                var a = this;
                var aR = i > 0 ? d.radius : _chart.bubbleR(d);
                var aX = i > 0 ? d.xPixel : bubbleX(d);
                var aY = i > 0 ? d.yPixel : bubbleY(d);
                var aKey = d.key0;

                if (d3.select(a).classed('hide-label')) { return; }

                for(var j = i + 1; j < nodes[0].length; j++) {
                    
                    var b = d3.select(nodes[0][j]);
                    var d = b.datum();

                    var bX = d.xPixel = bubbleX(d);
                    var bY = d.yPixel = bubbleY(d);
                    var bR = d.radius = _chart.bubbleR(d);
                    var bKey = d.key0;

                    if (Math.abs(aY - bY) > labelHeight || bR < _chart.minRadiusWithLabel() || b.classed('hide-label')) { 
                        continue;
                    }

                    var aXmin = aX - (aKey+'').length * letterWidth/2;
                    var aXmax = aX + (aKey+'').length * letterWidth/2;

                    var bXmin = bX - (bKey+'').length * letterWidth/2;
                    var bXmax = bX + (bKey+'').length * letterWidth/2;

                    var isLabelOverlapped = aXmin >= bXmin && aXmin <= bXmax || aXmax >= bXmin && aXmax <= bXmax || aXmin <= bXmin && aXmax >= bXmax;

                    if (isLabelOverlapped) {
                        b.classed('hide-label', true);
                    }
                }
            });
    }

    function isNodeOverlapped(d1,d2) {
        var dist = Math.sqrt( (d1.xPixel-d2.xPixel)*(d1.xPixel-d2.xPixel) + (d1.yPixel-d2.yPixel)*(d1.yPixel-d2.yPixel));
        return d1.radius + 8 >= dist;
    }


    _chart.showPopup = function(d, i) {

        if (_chart.svg().select('.mouse-out-detect').empty()) {
            _chart.svg().insert('rect', ":first-child")
                .attr('class', 'mouse-out-detect')
                .attr({width: _chart.width(), height: _chart.height()})
                .on('mousemove', _chart.hidePopup);
        }

        _isHoverNode = d;

        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-content').html('');

        popupBox.append('div')
            .attr('class','popup-bridge')
            .style('width', (_chart.bubbleR(d) * 2)+'px')
            .style('height', (_chart.bubbleR(d) + 24)+'px')
            .style('border-radius', '0 0 '+_chart.bubbleR(d)+'px '+_chart.bubbleR(d)+'px')
            .on('click', function(){ 
                _chart.onClick(d);
            })
            .append('div')
            .attr('class', 'bridge-hitbox');

        var popupTableWrap = popupBox.append('div')
            .attr('class', 'popup-table-wrap')
            .on('mouseleave', _chart.hidePopup);

        var popupTable = popupTableWrap.append('table')
            .attr('class', 'popup-table');
            

        var popupTableHeader = popupTable.append('tr');

        var headerItems = popupTableHeader.selectAll('th')
            .data(_popupHeader)
            .enter()
            .append('th');

        headerItems.append('div')
            .attr('class', 'ellipse-text')
            .text(function(d){ return d.label; })
            .append('div')
            .attr('class', 'full-text')
            .text(function(d){ return d.label; })
            .on('mouseenter', function(){
                d3.select(this)
                    .style('transform', function(){
                    var elm = d3.select(this);
                    var textWidth = elm.node().getBoundingClientRect().width;
                    var boxWidth = elm.node().parentNode.getBoundingClientRect().width;
                    
                    if (textWidth < boxWidth) {
                        elm.classed('scroll-text', false)
                        return 'none';
                    }
                    var dist = textWidth - boxWidth;

                    elm.style('transition-duration', (dist * .05 + 's'))
                        .classed('scroll-text', true)
                        .on('webkitTransitionEnd', function(){

                            setTimeout(function() {
                                elm.classed('scroll-text', false)
                                .style('transform', 'translateX(0)');
                            }, 500);
                            

                            setTimeout(function(){
                                elm.style('transform', 'translateX('+ -dist +'px)')
                                    .classed('scroll-text', true)}, 1000);
                        });

                    return 'translateX('+ -dist +'px)';
                });
            })
            .on('mouseleave', function(){
                d3.select(this)
                    .classed('scroll-text', false)
                    .style('transform', 'translateX(0)');
            });

        var dataRows = [d];
        var nodes = _chart.svg().selectAll('.node');
        var foundCurrentNode = false;

        nodes[0].reverse();

        nodes.each(function(node, i){

            if (d === node) { 
                foundCurrentNode = true; 
                return;
            }

            if (foundCurrentNode && isNodeOverlapped(d, node)) {
                dataRows.push(node);
            }
        });

        var rowItems = popupTable.selectAll('.popup-row-item')
            .data(dataRows)
            .enter()
            .append('tr')
            .html(function(d) {  return renderPopupRow(d); })
            .on('click', function(d){ 
                _chart.onClick(d);
            })
            .attr('class', 'popup-row-item');

        _chart.updatePopup();
        
        popup.classed('js-showPopup popup-scrollable delay-pointer scatter-plot-popup', true);

        _chart.root().node().parentNode.parentNode.style.zIndex = 1;

        setTimeout(function(){ popup.classed('delay-pointer', false)}, 250);

        positionPopup(d, this);
    }

    _chart.updatePopup = function (){
        
        if (_chart.hasFilter()) {
            _chart.popup().selectAll('.popup-row-item')
            .each(function(d){

                d3.select(this)
                    .classed('deselected', !_chart.isSelectedNode(d))
                    .classed('selected', _chart.isSelectedNode(d));
            })
        } else {
            _chart.popup().selectAll('.popup-row-item')
                .classed('deselected', false)
                .classed('selected', false);
        }
        
    }

    function renderPopupRow(d) {

        var str = '<td><div class="table-dim"><div class="table-legend" style="background:'+_chart.getColor(d)+'"></div><div class="table-dim-val">'+_chart.label()(d)+'</div></div></td>';
                
        for (var i = 1; i< _popupHeader.length; i++) {
            if (_popupHeader[i].alias) {
                str += '<td>'+ dc.utils.formatValue(d[_popupHeader[i].alias]) +'</td>';
            } 
        }
        return str;
    }

    _chart.hidePopup = function() {
        _chart.popup().classed('js-showPopup', false);
        
        _chart.root().node().parentNode.parentNode.style.zIndex = 'auto';

        d3.selectAll('.node-hover')
            .classed('node-hover', false);

        _isHoverNode = null;
    }

    function positionPopup(d, e) {

        var x = bubbleX(d) + _chart.margins().left;
        var y = bubbleY(d) + _chart.margins().top;

        var popup =_chart.popup()
            .style('transform', function(){
                var popupWidth = d3.select(this).select('.chart-popup-box').node().getBoundingClientRect().width/2;
                var offsetX = x - popupWidth < 0 ? popupWidth - x - 16 : (x + popupWidth > _chart.width() ? _chart.width() - (x + popupWidth) + 16 : 0);
                
                d3.select(this).select('.popup-bridge')
                    .style('left', function(){
                        return offsetX !== 0 ? popupWidth - offsetX + 'px' : '50%';
                    });
                return 'translate('+(x + offsetX) +'px,'+y+'px)';
            });

        popup.select('.chart-popup-box')
            .classed('align-center', true)
            .classed('popdown', function(){
                return popup.node().getBoundingClientRect().top - 76 < d3.select(this).node().getBoundingClientRect().height ? true : false;
            })
            .select('.popup-table-wrap').style('overflow-y', function(){
                return popup.select('.popup-table').node().getBoundingClientRect().height > 160 ? 'scroll' : 'hidden';
            });


    }

/* --------------------------------------------------------------------------*/

    /**
     * Turn on or off the elastic bubble radius feature, or return the value of the flag. If this
     * feature is turned on, then bubble radii will be automatically rescaled to fit the chart better.
     * @name elasticRadius
     * @memberof dc.bubbleChart
     * @instance
     * @param {Boolean} [elasticRadius=false]
     * @return {Boolean}
     * @return {dc.bubbleChart}
     */
    _chart.elasticRadius = function (elasticRadius) {
        if (!arguments.length) {
            return _elasticRadius;
        }
        _elasticRadius = elasticRadius;
        return _chart;
    };

    /**
     * Turn on or off the bubble sorting feature, or return the value of the flag. If enabled,
     * bubbles will be sorted by their radius, with smaller bubbles in front.
     * @name sortBubbleSize
     * @memberof dc.bubbleChart
     * @instance
     * @param {Boolean} [sortBubbleSize=false]
     * @return {Boolean}
     * @return {dc.bubbleChart}
     */
    _chart.sortBubbleSize = function (sortBubbleSize) {
        if (!arguments.length) {
            return _sortBubbleSize;
        }
        _sortBubbleSize = sortBubbleSize;
        return _chart;
    };

    _chart.plotData = function () {
        if (_elasticRadius) {
            _chart.r().domain([_chart.rMin(), _chart.rMax()]);
        }

        _chart.r().range([_chart.MIN_RADIUS, _chart.xAxisLength() * _chart.maxBubbleRelativeSize()]);

        var data = _chart.data();
        if (_sortBubbleSize) {
            // sort descending so smaller bubbles are on top
            var radiusAccessor = _chart.radiusValueAccessor();
            data.sort(function (a, b) { return d3.descending(radiusAccessor(a), radiusAccessor(b)); });
        }
        var bubbleG = _chart.chartBodyG().selectAll('g.' + _chart.BUBBLE_NODE_CLASS)

/* OVERRIDE -----------------------------------------------------------------*/
            .data(_chart.data(), function (d) { return d.key0; });
/* --------------------------------------------------------------------------*/

        if (_sortBubbleSize) {
            // Call order here to update dom order based on sort
            bubbleG.order();
        }

        renderNodes(bubbleG);

        updateNodes(bubbleG);

        removeNodes(bubbleG);

        _chart.fadeDeselectedArea();

    };

    function renderNodes (bubbleG) {
        
        var bubbleGEnter = bubbleG.enter().append('g');

        var debouncePopUp = _chart.debounce(function(d, i, elm){
            d3.select(elm).classed('node-hover', true);
            _chart.showPopup(d, i);
        }, 250);

        bubbleGEnter
            .attr('class', _chart.BUBBLE_NODE_CLASS)
            .attr('transform', bubbleLocator)
/* OVERRIDE -----------------------------------------------------------------*/
            .on('mouseover', function(d, i){
                if (JSON.stringify(_isHoverNode) !== JSON.stringify(d) ) {
                    debouncePopUp(d, i, this);
                    _chart.hidePopup();
                } 
            })
/* --------------------------------------------------------------------------*/
            .append('circle').attr('class', function (d, i) {
                return _chart.BUBBLE_CLASS + ' _' + i;
            })
            .on('click', _chart.onClick)
            .attr('fill', _chart.getColor)
            .attr('r', 0);


        dc.transition(bubbleG, _chart.transitionDuration())
            .selectAll('circle.' + _chart.BUBBLE_CLASS)
            .attr('r', function (d) {
                return _chart.bubbleR(d);
            })
            .attr('opacity', function (d) {
                return (_chart.bubbleR(d) > 0) ? 1 : 0;
            });

        _chart._doRenderLabel(bubbleGEnter);

        //_chart._doRenderTitles(bubbleGEnter);
    }

    function updateNodes (bubbleG) {
        dc.transition(bubbleG, _chart.transitionDuration())
            .attr('transform', bubbleLocator)

/* OVERRIDE -----------------------------------------------------------------*/
            .select('circle.' + _chart.BUBBLE_CLASS)
/* --------------------------------------------------------------------------*/

            .attr('fill', _chart.getColor)
            .attr('r', function (d) {
                return _chart.bubbleR(d);
            })
            .attr('opacity', function (d) {
                return (_chart.bubbleR(d) > 0) ? 1 : 0;
            });

        _chart.doUpdateLabels(bubbleG);
        _chart.doUpdateTitles(bubbleG);

        
    }

    function removeNodes (bubbleG) {
        bubbleG.exit().remove();
    }

    function bubbleX (d) {
        var x = _chart.x()(_chart.keyAccessor()(d));
        if (isNaN(x)) {
            x = 0;
        }
        return x;
    }

    function bubbleY (d) {
        var y = _chart.y()(_chart.valueAccessor()(d));
        if (isNaN(y)) {
            y = 0;
        }
        return y;
    }

    _chart.renderBrush = function () {
        // override default x axis brush from parent chart
    };

    _chart.redrawBrush = function () {
        // override default x axis brush from parent chart
        _chart.fadeDeselectedArea();
    };

    return _chart.anchor(parent, chartGroup);
};
/******************************************************************************
 * END OVERRIDE: dc.bubbleChart                                               *
 * ***************************************************************************/
