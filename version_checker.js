var exec = require('child_process').exec;
var pkgVersion = require('./package.json').version;

exec('npm view @mapd/mapdc version', (error, stdout, stderr) => {
  var packageVersion = _formatVersion(pkgVersion);
  var npmVersion = _formatVersion(stdout);
  var packageNeedsBump = _packageNeedsBump(npmVersion, packageVersion);
  if (packageNeedsBump) process.exit(1);
});

var _formatVersion = (versionString) => (
  versionString.trim().split('.').map((item) => ( +item))
);

var _packageNeedsBump = (npm, pkg) => {
  for (var i = 0; i < 3; i++) {
    var npmValue = npm[i];
    var pkgValue = pkg[i];
    if (npmValue > pkgValue) return true;
    if (pkgValue > npmValue) return false;
  }
  return true;
};
