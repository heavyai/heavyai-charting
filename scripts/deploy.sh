#!/bin/bash

# show the command being run
set -x

# tell jenkins to fail if any of the commands fail
set -e

# If the last commit was from jenkins, do nothing
if [[ `git log -1 | grep "Jenkins MapD"` ]]; then
 echo "Ignoring superfluous build spawned by jenkins"
 exit 0
fi

# remove the previous temp branch
git branch -d temp

# checkout a new temp branch
git checkout -b temp

# bump the version
# TODO: set major, minor, or patch some how
npm --no-git-tag-version version patch

# Add and commit the new version
git commit -a -m "`sh package_version.sh`"

# push the new version to github
git push origin temp:master

# publish the module to npm
npm publish

