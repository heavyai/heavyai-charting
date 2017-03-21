import {
  customTimeFormat,
  extractTickFormat,
  convertGeojsonToSql
} from "../overrides/src/utils"

import {
  formatDataValue,
  maybeFormatInfinity
} from "../overrides/src/formatting-helpers"

import deepEqual from "deep-equal"

import d3 from 'd3';
import {constants} from './core';

export const dateFormat = d3.time.format('%m/%d/%Y');

export const printers = {};

printers.filters = function (filters) {
    var s = '';

    for (var i = 0; i < filters.length; ++i) {
        if (i > 0) {
            s += ', ';
        }
        s += printers.filter(filters[i]);
    }

    return s;
};

printers.filter = function (filter) {
    var s = '';

    if (typeof filter !== 'undefined' && filter !== null) {
        if (filter instanceof Array) {
            if (filter.length >= 2) {
                s = '[' + utils.printSingleValue(filter[0]) + ' -> ' + utils.printSingleValue(filter[1]) + ']';
            } else if (filter.length >= 1) {
                s = utils.printSingleValue(filter[0]);
            }
        } else {
            s = utils.printSingleValue(filter);
        }
    }

    return s;
};

export const pluck = (n, f) => {
    if (!f) {
        return function (d) { return d[n]; };
    }
    return function (d, i) { return f.call(d, d[n], i); };
};

export const utils = {};

utils.printSingleValue = function (filter) {
    var s = '' + filter;

    if (filter instanceof Date) {
        s = dateFormat(filter);
    } else if (typeof(filter) === 'string') {
        s = filter;
    } else if (utils.isFloat(filter)) {
        s = utils.printSingleValue.fformat(filter);
    } else if (utils.isInteger(filter)) {
        s = Math.round(filter);
    }

    return s;
};
utils.printSingleValue.fformat = d3.format('.2f');

// FIXME: these assume than any string r is a percentage (whether or not it
// includes %).
utils.add = function (l, r, c) {
    if (typeof r === 'string') {
        r = r.replace('%', '');
    }

    if (l instanceof Date) {
        if (typeof r === 'string') {
            r = +r;
        }
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() + r);
        return d;
    } else if (typeof r === 'string') {
        var percentage = (+r / 100);
        return l + (c * percentage);
    } else {
        return l + r;
    }
};

utils.subtract = function (l, r, c) {
    if (typeof r === 'string') {
        r = r.replace('%', '');
    }

    if (l instanceof Date) {
        if (typeof r === 'string') {
            r = +r;
        }
        var d = new Date();
        d.setTime(l.getTime());
        d.setDate(l.getDate() - r);
        return d;
    } else if (typeof r === 'string') {
        var percentage = (+r / 100);
        return l - (c * percentage);
    } else {
        return l - r;
    }
};

utils.isNumber = function (n) {
    return n === +n;
};

utils.isFloat = function (n) {
    return n === +n && n !== (n | 0);
};

utils.isInteger = function (n) {
    return n === +n && n === (n | 0);
};

utils.isNegligible = function (n) {
    return !utils.isNumber(n) || (n < constants.NEGLIGIBLE_NUMBER && n > -constants.NEGLIGIBLE_NUMBER);
};

utils.clamp = function (val, min, max) {
    return val < min ? min : (val > max ? max : val);
};

var _idCounter = 0;
utils.uniqueId = function () {
    return ++_idCounter;
};

/* OVERRIDE ---------------------------------------------------------------- */
utils.nameToId = function (name){
    if (parseFloat(name))
      return name;
    else
      return name.toLowerCase().replace(/[\s]/g, '_').replace(/[\.']/g, '');
};
/* ------------------------------------------------------------------------- */

utils.appendOrSelect = function (parent, selector, tag) {
    tag = tag || selector;
    var element = parent.select(selector);
    if (element.empty()) {
        element = parent.append(tag);
    }
    return element;
};

utils.safeNumber = function (n) { return utils.isNumber(+n) ? +n : 0;};

utils.b64toBlob = function(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

utils.isOrdinal = function (type) {
    var BOOL_TYPES = {BOOL: true}

    var TEXT_TYPES = {
      varchar: true,
      text: true,
      STR: true
    }

    var TEXT_AND_BOOL_TYPES = Object.assign({}, TEXT_TYPES, BOOL_TYPES)

    return type in TEXT_AND_BOOL_TYPES
}

utils.isQuantitative = function (type) {
    var NUMERICAL_INTEGER_TYPES = {
      int2: true,
      int4: true,
      int8: true,
      SMALLINT: true,
      INT: true,
      BIGINT: true
    }

    var NUMERICAL_REAL_TYPES = {
      FLOAT: true,
      DOUBLE: true,
      DECIMAL: true
    }

    var NONCUSTOM_NUMERICAL_TYPES = Object.assign({},
      NUMERICAL_INTEGER_TYPES,
      NUMERICAL_REAL_TYPES
    )

    return type in NONCUSTOM_NUMERICAL_TYPES
}

utils.deepEquals = deepEqual
utils.customTimeFormat = customTimeFormat
utils.extractTickFormat = extractTickFormat
utils.convertGeojsonToSql = convertGeojsonToSql
utils.formatValue = formatDataValue
utils.maybeFormatInfinity = maybeFormatInfinity

utils.nullsFirst = function (sorting) {
  return (a,b) => {
    if (a === null) {
      return -1
    } else if (b === null) {
      return 1
    }

    return sorting(a,b)
  }
}

utils.nullsLast = function (sorting) {
  return (a,b) => {
    if (a === null) {
      return 1
    } else if (b === null) {
      return -1
    }

    return sorting(a,b)
  }
}
