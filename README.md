mapdc.js
=====

Dimensional charting built to work natively with crossfilter rendered using d3.js.

### Installation:

Clone down the repo and run the following commands:

```bash
# make it so that you can't commit the generated files.
git update-index --assume-unchanged mapdc.js
git update-index --assume-unchanged mapdc.min.js
git update-index --assume-unchanged mapdc.js.map
git update-index --assume-unchanged mapdc.min.js.map

npm install # to get the dependencies.
npm install -g grunt-cli # to get the Grunt build tool.
grunt build # to build the mapdc.js files.
grunt watch # to automatically rebuild the mapdc.js files after each save.
```
### Pull Requests:

Attach the appropriate semvar tag below to one of the commit messages in your pull request. This allows Jenkins to publish to npm automatically.

Semvar Tag | Description
--- | ---
`[major]` | major breaking changes
`[minor]` | new features
`[patch]` | Bugfixes, documentation

Jenkins will not let you merge a pull request that contains a missing or multiple semvar tags. **One per Pull Request!**

### Developing mapdc and another project at the same time:

_"What is hard is figuring out a good workflow for developing both an npm module and a project that depends on it at the same time." - http://justjs.com/posts/npm-link-developing-your-own-npm-modules-without-tears_

**If you have not cloned down the mapdc.js repo, do that first.** Then run the following commands:

1. `npm link` - inside the mapdc/ repo directory.
2. `npm link @mapd/mapdc` - inside the project directory (same level as `package.json` directory).

This overrides the `node_modules` directory and tells your project to use the mapdc/ repo instead.

### Updating projects that require mapdc after changes are made

Run `npm install @mapd/mapdc@latest --save` from within your project to update to the latest version.
