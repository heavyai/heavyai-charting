const jsdom = require("jsdom")
const { JSDOM } = jsdom
var atob = require("atob")
var url = require("url")
var fs = require("fs")

var exposedProperties = ['window', 'navigator', 'document'];

global.window = new JSDOM(
  `<!doctype html><html><body></body></html>`,
  {
    resources: "usable",
    runScripts: "dangerously",
    url: "http://localhost"
  }
).window
global.document = global.window.document
global.window.atob = atob
global.window.URL = url
global.window.TCopyParams = () => {}
global.window.TDatumType =  {"SMALLINT":0,"INT":1,"BIGINT":2,"FLOAT":3,"DECIMAL":4,"DOUBLE":5,"STR":6,"TIME":7,"TIMESTAMP":8,"DATE":9,"BOOL":10,"INTERVAL_DAY_TIME":11,"INTERVAL_YEAR_MONTH":12}
global.window.TEncodingType = {"NONE":0,"FIXED":1,"RL":2,"DIFF":3,"DICT":4,"SPARSE":5}

Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    exposedProperties.push(property);
    global[property] = document.defaultView[property];
  }
});

global.navigator = {
  userAgent: 'node.js'
};

console.warn = (a) => {}
console.error = (a) => {}

propagateToGlobal(global.window)

function propagateToGlobal (window) {
  for (let key in window) {
    if (!window.hasOwnProperty(key)) continue
    if (key in global) continue
    global[key] = window[key]
  }
}
