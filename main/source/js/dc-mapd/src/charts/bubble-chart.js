/******************************************************************************
 * OVERRIDE: dc.bubbleChart                                                   *
 * ***************************************************************************/
dc.bubbleChart = function (parent, chartGroup) {

/* OVERRIDE -----------------------------------------------------------------*/
    var _chart = dc.bubbleMixin(dc.capMixin(dc.coordinateGridMixin({})));
/* --------------------------------------------------------------------------*/

    var _elasticRadius = false;

    _chart.transitionDuration(750);

    var bubbleLocator = function (d) {
        return 'translate(' + (bubbleX(d)) + ',' + (bubbleY(d)) + ')';
    };

/* OVERRIDE -----------------------------------------------------------------*/

    _chart.hideOverlappedLabels = function (){
        var labels = _chart.svg().selectAll('.node');

        var labelHeight = 10;
        var letterWidth = 5;

        labels
            .classed('hide-label', false)
            .each(function(d, i){

                var a = this;
                var aX = bubbleX(d);
                var aY = bubbleY(d);
                var aR = _chart.bubbleR(d);
                var aKey = d.key0;

                var overlapList = d.overlapList = [];

                labels.each(function(d, j){

                    var b = this;

                    var bX = bubbleX(d);
                    var bY = bubbleY(d);
                    var bR = _chart.bubbleR(d);
                    var bKey = d.key0;

                    if (a === b || Math.abs(aY - bY) > labelHeight ) { return;}
                    
                    var aXmin = aX - (aKey+'').length * letterWidth/2;
                    var aXmax = aX + (aKey+'').length * letterWidth/2;


                    var bXmin = bX - (bKey+'').length * letterWidth/2;
                    var bXmax = bX + (bKey+'').length * letterWidth/2;

                    var isOverlapped = aXmin >= bXmin && aXmin <= bXmax || aXmax >= bXmin && aXmax <= bXmax || aXmin <= bXmin && aXmax >= bXmax;

                    if (isOverlapped && i > j) {
                        overlapList.push(b);
                    }
                });
            });
        
        labels[0].reverse();
        
        labels.each(function(d) {
            if (d.overlapList.length === 0 || d3.select(this).classed('hide-label')) {
                return;
            } 
            for (var i = 0; i < d.overlapList.length ; i++) {
                d3.select(d.overlapList[i]).classed('hide-label', true);
            }
        });
        
    }

    function showPopup(d, i) {
        var popup = _chart.popup();

        var popupBox = popup.select('.chart-popup-box').html('');

        popupBox.append('div')
            .attr('class', 'popup-legend')
            .style('background-color', fill(d,i));

        popupBox.append('div')
            .attr('class', 'popup-value')
            .html(function(){
                return '<div class="popup-value-dim">'+ 'test' +'</div><div class="popup-value-measure">'+ 'measure' +'</div>';
            });

        popup.classed('js-showPopup', true);
    }

    function hidePopup() {
        _chart.popup().classed('js-showPopup', false);
    }

    function positionPopup() {
        var coordinates = [0, 0];
        coordinates = d3.mouse(this);
        var x = coordinates[0] + _chart.width() / 2;
        var y = coordinates[1] + _chart.height() / 2;

        var popup =_chart.popup()
            .attr('style', function(){
                return 'transform:translate('+x+'px,'+y+'px)';
            });

        popup.select('.chart-popup-box')
            .classed('align-right', function(){
                return x + d3.select(this).node().getBoundingClientRect().width > _chart.width();
            });
    }

/* --------------------------------------------------------------------------*/

    _chart.elasticRadius = function (elasticRadius) {
        if (!arguments.length) {
            return _elasticRadius;
        }
        _elasticRadius = elasticRadius;
        return _chart;
    };

    _chart.plotData = function () {
        if (_elasticRadius) {
            _chart.r().domain([_chart.rMin(), _chart.rMax()]);
        }
        _chart.r().range([_chart.MIN_RADIUS, _chart.xAxisLength() * _chart.maxBubbleRelativeSize()]);

        var bubbleG = _chart.chartBodyG().selectAll('g.' + _chart.BUBBLE_NODE_CLASS)

/* OVERRIDE -----------------------------------------------------------------*/
            .data(_chart.data(), function (d) { return d.key0; });
/* --------------------------------------------------------------------------*/

        renderNodes(bubbleG);

        updateNodes(bubbleG);

        removeNodes(bubbleG);

        _chart.fadeDeselectedArea();

        console.log('plot');
    };

    function renderNodes (bubbleG) {
        var bubbleGEnter = bubbleG.enter().append('g');

        bubbleGEnter
            .attr('class', _chart.BUBBLE_NODE_CLASS)
            .attr('transform', bubbleLocator)
            .append('circle').attr('class', function (d, i) {
                return _chart.BUBBLE_CLASS + ' _' + i;
            })
            .on('click', _chart.onClick)
/* OVERRIDE -----------------------------------------------------------------*/
            .on('mouseenter', showPopup)
            .on('mouseleave', hidePopup)
/* --------------------------------------------------------------------------*/
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

        _chart._doRenderTitles(bubbleGEnter);
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
