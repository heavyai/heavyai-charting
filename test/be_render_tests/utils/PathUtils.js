const callsite = require('callsite');
const path = require('path');

function getCallerFile(steps = 1) {
  const callstack = callsite();
  if (steps > callstack.length - 1) {
    throw new Error(
      `Cannot get caller file information back ${step} steps. There are only ${callstack.length -
        1} traces in the stack`
    );
  }
  return callstack[steps + 1].getFileName();
}

function getCallerPath(steps = 1) {
  return path.dirname(getCallerFile(steps + 1));
}

module.exports = { getCallerFile, getCallerPath };
