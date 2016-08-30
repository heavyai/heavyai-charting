mapdc.js
=====

Dimensional charting built to work natively with crossfilter rendered using d3.js.

## Running the Examples

##### Step 1 Build Dependencies
```bash
# ./mapd-crossfilter
npm run build

# ./mapd-con
npm run build

# ./mapdc
npm run build
```
##### Step 2 Run Start Script

```bash
# ./mapdc
npm run start 
```

## Organization

The repo is separated into two parts. The root file is `mapdc/index.js`

#### Part 1: `mapdc/src`

The original DC source and our overwrites make up the files in this folder. 

There are a few things to keep in mind in this folder:
* The files in here are concated together by `grunt tasks`, so one cannot use `require`.
* The `dc` and `d3` objects are considered globals.
* Our overwrites to DC are flagged with comments, but not all of them are flagged
* The code is written in ES5

#### Part 2: `mapdc/overrides`

This folder only contains our overrides and mixins to DC.

Our goal is to eventually move all our additions to the DC library to this folder from `mapdc/src`

When working in this folder, note that:
* The code is written in ES6/7
* The `dc` and `d3` objects are imports, not globals

## Development Guidelines

### Use Mixins and Overrides

When making new additions to DC, do not directly modify the files in `mapdc/src`. Instead, one should use the overrides and mixin patterns found in `mapdc/overrides`. 

Straying from this guideline will prevent us from upgrading the DC library. In addition, any new code you add to `mapdc/src` will not be linted or tested.

### Use Asynchronous Methods

Asynchronous methods must be used. Synchronous methods are depreacted and cause a bad user experience.

For instance, use the asynchronous versions of the `render` and `redraw` methods:

```js
// bad
chart.render()
chart.redraw()

// good
chart.renderAsync()
chart.redrawAsync()
```

Since our version of DC must make asynchronous requests to get data, use the `dataAsync()` method for this request and only use `data()` as the cached result of `dataAsync()`

```js
// bad
chart.data((group) => {
  return group.top()
})

// good
chart.dataAsync((group, callback) => {
  group.topAsync()
    .then(result => {
      chart.dataCache = result
      callback(null, result)
    })
    .catch(e => callback(e))
})

chart.data(() => chart.dataCache)
```

### Testing

Please write unit tests for all your `mapdc/overrides` code. The test files are located in `overrides/test`. 

### Linting

Please lint all your code in `mapdc/overrides`. The lint config file can be found in `overrides/.eslintrc.json` and closely mirrors the rules in `projects/dashboard-v2`


### Scripts

In the `mapdc/overrides` folder

Command | Description
--- | ---
`npm run test` | Runs unit tests and provides coverage info
`npm run lint` | Lints files

In the `mapdc` folder

Command | Description
--- | ---
`npm run start` | Copies files for examples and then serves the example
`npm run build` | Build DC for dashboard-v2
`npm run watch` | Watches for changes in `./overrides` and `./src`


