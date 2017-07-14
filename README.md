# MapD Charting

Dimensional charting built to work natively with crossfilter rendered using d3.js.

# Screenshots

#### Flights Dataset: Brushing on timeline with Bubble Chart and Row Chart

![example1](https://cloud.githubusercontent.com/assets/2932405/25641647/1acce1f2-2f4a-11e7-87d4-a4e80cb262f5.gif)

#### Tweets Dataset: Brushing on timeline and hovering on Pointmap datapoint which displays row information

![example2](https://user-images.githubusercontent.com/4845281/28191946-21bb7ec0-67e8-11e7-855e-8922939d1241.gif)

#### Tweets Dataset: Using MapD-Draw tool on pointmap to select specific areas on a map

![example5](https://user-images.githubusercontent.com/4845281/28191947-21bd2ad6-67e8-11e7-9c8d-a5ddcd0f07fc.gif)

# Examples

Visit our [examples page](https://mapd.github.io/mapd-charting/example/) for ideas of what can be created MapD Charting

# Quick Start

##### Step 1: Install Dependencies

```bash
npm install #downloads all dependencies and devDependencies
npm install mapbox-gl@https://github.com/mapd/mapbox-gl-js/tarball/9c04de6949fe498c8c79f5c0627dfd6d6321f307 #downloads mapbox peer dependency
```

##### Step 2: Run Start Script
```bash
npm run start
```

# Synopsis

MapD-Charting is a superfast charting library that works natively with [crossfilter](https://github.com/square/crossfilter) that is based off [dc.js](https://github.com/dc-js/dc.js).  It is designed to work with MapD-Connector and MapD-Crossfilter to create charts instantly with our MapD-Core SQL Database.  Please see [examples](#examples) for further understanding to quickly create interactive charts.

Our [Tweetmap Demo](https://www.mapd.com/demos/tweetmap/) was made only using MapD-Charting.

# Documentation

Visit our [API Docs](http://mapd.github.io/mapd-charting/docs/) for additional information on MapD Charting

# Testing

New components in MapD-Charting should be unit-tested and linted.  All tests will be in the same folder as the new component.

```
+-- src
|   +-- /mixins/new-mixin-component.js
|   +-- /mixins/new-mixin-component.unit.spec.js
```

The linter and all tests run on
```bash
npm run test
```

To check only unit-tests run:
```bash
npm run test:unit
```

### Linting

Please lint all your code in `mapd-charting/`. The lint config file can be found in `.eslintrc.json`.  For new components, please fix all lint warnings and errors.

# Scripts

| Command        | Description  |
--- | ---
`npm run start` | Copies files for examples and then serves the example
`npm run build` | Runs webpack and builds js and css in `/dist`
`npm run docs` | Creates and opens docs
`npm run test` | Runs both linting and unit tests
`npm run clean` | Removes node modules, dist, docs, and example files

# Documentation
The charting library uses [documentation.js](https://github.com/documentationjs/documentation) for API documentation. Docs can be built and viewed locally with the `npm run docs` command.

## Contributing

Interested in contributing? We'd love for you to help! Check out [Contributing.MD](.github/CONTRIBUTING.md)
