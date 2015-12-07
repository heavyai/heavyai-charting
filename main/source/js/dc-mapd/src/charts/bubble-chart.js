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
        var labels = _chart.svg().selectAll('.node text');

        var labelHeight = 12;
        var letterWidth = 6;

        labels.each(function(d){
            //console.log(bubbleX(d), bubbleY(d), (_chart.bubbleR(d)+'').length);
            var a = this;
            var aX = bubbleX(d);
            var aY = bubbleY(d);
            var aR = _chart.bubbleR(d);
            var aKey = d.key0;
            var aXmin = aX - (aR+'').length * letterWidth;
            var aXmax = aX + (aR+'').length * letterWidth;

            d3.select(a).append('rect')
                .attr('width', (aKey+'').length * letterWidth)
                .attr('height', 12)
                .attr('x', ((aKey+'').length * -letterWidth)/2)
                .attr('y', -6)
                .style('opacity', '.5');



            console.log(d.key0);

            labels.each(function(d){

                var b = this;

                //if (d3.select(b).style('opacity') !== '0') {

                    var bX = bubbleX(d);
                    var bY = bubbleY(d);
                    var bR = _chart.bubbleR(d);

                    //if (a === b || Math.abs(aY - bY) > labelHeight ) { return;}

                    

                    var bXmin = bX - (bR+'').length * letterWidth;
                    var bXmax = bX + (bR+'').length * letterWidth;


                    //var isOverlapped = aXmax >= bXmin && aXmax <= bXmax;


                    //d3.select(a).style('opacity', isOverlapped ? '0' : '1');




                //}


            });

            
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
        _chart.hideOverlappedLabels();
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
