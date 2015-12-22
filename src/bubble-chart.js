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
    var _popupTimerShow = null;
    var _popupTimerHide = null;
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

        nodes
            .classed('hide-label', false)
            .each(function(d, i){

                var a = this;
                var aX = d.xPixel = bubbleX(d);
                var aY = d.yPixel = bubbleY(d);
                var aR = d.radius = _chart.bubbleR(d);
                var aKey = d.key0;

                var labelOverlapList = d.labelOverlapList = [];
                var nodeOverlapList = d.nodeOverlapList = [];
                var d1 = d;

                nodes.each(function(d, j){

                    var b = this;

                    var bX = d.xPixel = bubbleX(d);
                    var bY = d.yPixel = bubbleY(d);
                    var bR = d.radius = _chart.bubbleR(d);
                    var bKey = d.key0;

                    if (a === b || Math.abs(aY - bY) > labelHeight ) { return;}

                    var aXmin = aX - (aKey+'').length * letterWidth/2;
                    var aXmax = aX + (aKey+'').length * letterWidth/2;


                    var bXmin = bX - (bKey+'').length * letterWidth/2;
                    var bXmax = bX + (bKey+'').length * letterWidth/2;

                    var isLabelOverlapped = aXmin >= bXmin && aXmin <= bXmax || aXmax >= bXmin && aXmax <= bXmax || aXmin <= bXmin && aXmax >= bXmax;

                    if (isLabelOverlapped && i > j) {
                        labelOverlapList.push(b);
                    }

                    if (isNodeOverlapped(d1, d)) {
                        nodeOverlapList.push(d);
                    }
                });
            });

        nodes[0].reverse();

        nodes.each(function(d) {
            if (d.labelOverlapList.length === 0 || d3.select(this).classed('hide-label')) {
                return;
            }
            for (var i = 0; i < d.labelOverlapList.length ; i++) {
                d3.select(d.labelOverlapList[i]).classed('hide-label', true);
            }
        });

    }

    function isNodeOverlapped(d1,d2) {
        var dist = Math.sqrt( (d1.xPixel-d2.xPixel)*(d1.xPixel-d2.xPixel) + (d1.yPixel-d2.yPixel)*(d1.yPixel-d2.yPixel));
        return d1.radius + 8 >= dist;
    }

    function showPopupTimer (d, i) {
        clearTimeout(_popupTimerHide);

        if (_chart.popup().classed('js-showPopup')) {
            clearTimeout(_popupTimerShow);
            _popupTimerShow = setTimeout(function(){ _chart.showPopup(d, i)}, 500);

        } else {
            _chart.showPopup(d, i);
        }
    }

    function hidePopupTimer () {
        if (_chart.popup().classed('js-showPopup')) {
            clearTimeout(_popupTimerHide);
            _popupTimerHide = setTimeout(function(){ _chart.hidePopup()}, 500);

        } 
    }

    _chart.showPopup = function(d, i) {

        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-box').html('')
            .classed('table-list', true)
            .style('max-height', Math.min(popup.node().getBoundingClientRect().top - 32, 160));

        var popupTableWrap = popupBox.append('div')
            .attr('class', 'popup-table-wrap')
            .on('mouseenter', function(){ 
                clearTimeout(_popupTimerShow); 
                clearTimeout(_popupTimerHide);
            })
            .on('mouseleave', hidePopupTimer);

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
                    
                    if (textWidth < 64) {
                        elm.classed('scroll-text', false)
                        return 'none';
                    }
                    var dist = textWidth - 64;

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
        
        popupTable.append('tr')
            .html(renderPopupRow(d));

        for (var i = 0; i < d.nodeOverlapList.length; i++) {
            popupTable.append('tr')
                .html(renderPopupRow(d.nodeOverlapList[i]));
        }

        popup.classed('js-showPopup popup-scrollable', true);

        d3.select('#charts-container')
            .style('z-index', 1005);

        positionPopup(d, this);
    }

    function renderPopupRow(d) {

        var formatNum = d3.format(".2s");
        var str = '<td><div class="table-dim"><div class="table-legend" style="background:'+_chart.getColor(d)+'"></div><div class="table-dim-val">'+d.key0+'</div></div></td>';
                
        for (var i = 1; i< _popupHeader.length; i++) {
            if (_popupHeader[i].alias) {
                str += '<td>'+formatNum(d[_popupHeader[i].alias])+'</td>';
            } 
        }
        return str;
    }


    _chart.hidePopup = function() {
        _chart.popup().classed('js-showPopup', false);
        d3.select('#charts-container')
            .style('z-index', 'auto');
    }

    function positionPopup(d, e) {

        var x = bubbleX(d) + _chart.margins().left;
        var y = bubbleY(d) + _chart.margins().top;


        var popup =_chart.popup()
            .attr('style', function(){
                var popupWidth = d3.select(this).select('.chart-popup-box').node().getBoundingClientRect().width/2;
                var offsetX = x - popupWidth < 0 ? popupWidth - x - 16 : (x + popupWidth > _chart.width() ? _chart.width() - (x + popupWidth) + 16 : 0);
                return 'transform:translate('+(x + offsetX) +'px,'+y+'px)';
            });

        popup.select('.chart-popup-box')
            .classed('align-center', true);

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

        bubbleGEnter
            .attr('class', _chart.BUBBLE_NODE_CLASS)
            .attr('transform', bubbleLocator)
/* OVERRIDE -----------------------------------------------------------------*/
            .on('mouseenter', showPopupTimer)
            .on('mouseleave', hidePopupTimer)
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
