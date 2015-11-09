var dc = {
    version: '<%= conf.pkg.version %>',
    constants: {
        CHART_CLASS: 'dc-chart',
        DEBUG_GROUP_CLASS: 'debug',
        STACK_CLASS: 'stack',
        DESELECTED_CLASS: 'deselected',
        SELECTED_CLASS: 'selected',
        NODE_INDEX_NAME: '__index__',
        GROUP_INDEX_NAME: '__group_index__',
        DEFAULT_CHART_GROUP: '__default_chart_group__',
        NEGLIGIBLE_NUMBER: 1e-10,

/* OVERRIDE EXTEND ----------------------------------------------------------*/
// These properties do not exist in the official DC.js library.               *
// They have been added for the purposes of MapD.                             *
        ACCENT_CLASS: 'accented',
        EVENT_DELAY: 0
/* --------------------------------------------------------------------------*/
    },

/* OVERRIDE EXTEND ----------------------------------------------------------*/
// These properties do not exist in the official DC.js library.               *
// They have been added for the purposes of MapD.                             *
    async: false,
    _lastFilteredSize: null,
    _sampledCount: 0,
    _refreshDisabled: false,
    _renderFlag: false,
    _redrawFlag: false,
    _renderId: 0,
    _redrawId: 0,
    _renderCount: 0,
    _redrawCount: 0,
    _renderIdStack: null,
    _redrawIdStack: null,
    _globalTransitionDuration: null,
    _redrawCallback: null,
/* --------------------------------------------------------------------------*/

    _renderlet: null
};

dc.chartRegistry = function () {
    // chartGroup:string => charts:array
    var _chartMap = {};

    function initializeChartGroup (group) {
        if (!group) {
            group = dc.constants.DEFAULT_CHART_GROUP;
        }

        if (!_chartMap[group]) {
            _chartMap[group] = [];
        }

        return group;
    }

    return {
        has: function (chart) {
            for (var e in _chartMap) {
                if (_chartMap[e].indexOf(chart) >= 0) {
                    return true;
                }
            }
            return false;
        },

        register: function (chart, group) {
            group = initializeChartGroup(group);
            _chartMap[group].push(chart);
        },

        deregister: function (chart, group) {

/* OVERRIDE ---------------------------------------------------------------- */
            if (chart.hasOwnProperty('sampling')) {
              chart.sampling(false); // to deincrement dc sampling counter
            }
/* ------------------------------------------------------------------------- */

            group = initializeChartGroup(group);
            for (var i = 0; i < _chartMap[group].length; i++) {
                if (_chartMap[group][i].anchorName() === chart.anchorName()) {
                    _chartMap[group].splice(i, 1);
                    break;
                }
            }
        },

        clear: function (group) {
            if (group) {
                delete _chartMap[group];
            } else {
                _chartMap = {};
            }
        },

        list: function (group) {
            group = initializeChartGroup(group);
            return _chartMap[group];
        }
    };
}();

dc.registerChart = function (chart, group) {
    dc.chartRegistry.register(chart, group);
};

dc.deregisterChart = function (chart, group) {
    dc.chartRegistry.deregister(chart, group);
};

dc.hasChart = function (chart) {
    return dc.chartRegistry.has(chart);
};

dc.deregisterAllCharts = function (group) {
    dc.chartRegistry.clear(group);
};

/* OVERRIDE ---------------------------------------------------------------- */
dc.disableRefresh = function (){
  dc._refreshDisabled = true;
};

dc.enableRefresh = function (){
  dc._refreshDisabled = false;
}
/* ------------------------------------------------------------------------- */

dc.filterAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        charts[i].filterAll();
    }
};

dc.refocusAll = function (group) {
    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {
        if (charts[i].focus) {
            charts[i].focus();
        }
    }
};

dc.renderAll = function (group) {

/* OVERRIDE ---------------------------------------------------------------- */
    if (dc._refreshDisabled)
        return;
    var queryGroupId = dc._renderId++;
    var stackEmpty = (dc._renderIdStack === null);
    dc._renderIdStack = queryGroupId;
    if (!stackEmpty)
        return;
/* ------------------------------------------------------------------------- */

    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {

/* OVERRIDE ---------------------------------------------------------------- */
        if (dc._sampledCount > 0) {
          console.log(dc._sampledCount);

            // relies on count chart being first -- bad
            if (charts[i].isCountChart())
                charts[i].render();
            else
                charts[i].renderAsync(queryGroupId,charts.length - 1);
        }
        else
            charts[i].renderAsync(queryGroupId,charts.length);
/* ------------------------------------------------------------------------- */
    }

    if (dc._renderlet !== null) {
        dc._renderlet(group);
    }
};

dc.redrawAll = function (group, callback) {

/* OVERRIDE ---------------------------------------------------------------- */
    if (dc._refreshDisabled)
        return;
    var queryGroupId = dc._redrawId++;
    var stackEmpty = false;
    if (callback !== undefined) {
        dc._redrawCallback = callback;
    }
    else {
        var stackEmpty = (dc._redrawIdStack === null);
        dc._redrawIdStack = queryGroupId;
    }
    if (!stackEmpty && callback === undefined)
        return;
/* ------------------------------------------------------------------------- */

    var charts = dc.chartRegistry.list(group);
    for (var i = 0; i < charts.length; ++i) {

/* OVERRIDE ---------------------------------------------------------------- */
        if (dc._sampledCount > 0) {
            if (charts[i].isCountChart()) {
                charts[i].redraw();
            }
            else {
                charts[i].redrawAsync(queryGroupId,charts.length - 1);
            }
        }
        else
            charts[i].redrawAsync(queryGroupId,charts.length);
    }
/* ------------------------------------------------------------------------- */

    if (dc._renderlet !== null) {
        dc._renderlet(group);
    }

/* OVERRIDE ---------------------------------------------------------------- */
    // Will be found in mapd.js
    $('body').trigger('updateFilterCounter');
/* ------------------------------------------------------------------------- */

};

dc.disableTransitions = false;

dc.transition = function (selections, duration, callback, name) {
    if (duration <= 0 || duration === undefined || dc.disableTransitions) {
        return selections;
    }

    var s = selections
        .transition(name)
        .duration(duration);

    if (typeof(callback) === 'function') {
        callback(s);
    }

    return s;
};

/* somewhat silly, but to avoid duplicating logic */
dc.optionalTransition = function (enable, duration, callback, name) {
    if (enable) {
        return function (selection) {
            return dc.transition(selection, duration, callback, name);
        };
    } else {
        return function (selection) {
            return selection;
        };
    }
};

dc.units = {};

dc.units.integers = function (start, end) {
    return Math.abs(end - start);
};

dc.units.ordinal = function (start, end, domain) {
    return domain;
};

dc.units.fp = {};
dc.units.fp.precision = function (precision) {
    var _f = function (s, e) {
        var d = Math.abs((e - s) / _f.resolution);
        if (dc.utils.isNegligible(d - Math.floor(d))) {
            return Math.floor(d);
        } else {
            return Math.ceil(d);
        }
    };
    _f.resolution = precision;
    return _f;
};

dc.round = {};
dc.round.floor = function (n) {
    return Math.floor(n);
};
dc.round.ceil = function (n) {
    return Math.ceil(n);
};
dc.round.round = function (n) {
    return Math.round(n);
};

dc.override = function (obj, functionName, newFunction) {
    var existingFunction = obj[functionName];
    obj['_' + functionName] = existingFunction;
    obj[functionName] = newFunction;
};

dc.renderlet = function (_) {
    if (!arguments.length) {
        return dc._renderlet;
    }
    dc._renderlet = _;
    return dc;
};

dc.instanceOfChart = function (o) {
    return o instanceof Object && o.__dcFlag__ && true;
};
