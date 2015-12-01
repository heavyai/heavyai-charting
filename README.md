mapdc.js
=====

Dimensional charting built to work natively with crossfilter rendered using d3.js.

### Installation:

To install and build mapdc, clone down the repo and run the following commands:

1. `npm install` to get the dependencies.
2. `npm install -g grunt-cli` to get the Grunt build tool.
3. `grunt build` to build the mapdc.js files.

### Making changes:

Make changes only to files in the src/ directory. Do not directly edit the `mapdc.js` files.

Automatically build the `mapdc.js` filesafter each save by running `grunt watch`.

### Developing mapdc and another project at the same time:

Streamline this process by linking mapdc to another project that depends on it using the following commands:

**mapd2-frontend**

1. `npm link` inside the mapdc/ project directory.
2. `npm link @mapd/mapdc` inside the mapd2-frontend/main/ directory.

Now, mapd2-frontend will treat the mapdc/ project directory as it's node_module dependency.

### Publishing to npm:

Publishing to npm makes the mapdc.js node module available to authorized projects.
You should increment the version number in the `package.json` file, then run `npm publish`.

### Updating projects that require mapdc.js after you've made changes
Once you've published to npm, you'll need to update the `package.json` of any project that uses mapdc.js in order to get the latest copy.

Run `npm install @mapd/mapdc@latest --save` from within your project to update to the latest version.

