mapdc.js
=====

Dimensional charting built to work natively with crossfilter rendered using d3.js.

### Installation:

To install and build mapdc, clone down the repo and run the following commands:

1. `npm install` to get the dependencies.
2. `npm install -g grunt-cli` to get the Grunt build tool.
3. `grunt build` to build the mapdc.js files.
4. `grunt watch` to automatically rebuild the mapdc.js files after each save.

### Developing mapdc and another project at the same time:

_"What is hard is figuring out a good workflow for developing both an npm module and a project that depends on it at the same time." - http://justjs.com/posts/npm-link-developing-your-own-npm-modules-without-tears_

If you've cloned the mapdc.js repo, you can have that be the lookup source for your project, instead of the typical `node_modules/` directory. 

For example, if you're developing the `mapd2-frontend/main` project and need to make changes to mapdc, you should run the following commands:

1. `npm link` - inside the mapdc/ repo directory.
2. `npm link @mapd/mapdc` - inside the mapd2-frontend/main/ directory.

Now, `mapd2-frontend/main` will treat the mapdc/ repo directory as it's node_module dependency.
