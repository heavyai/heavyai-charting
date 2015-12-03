#!/bin/bash

# If the last commit was from jenkins, do nothing
if [[ `git log -1 | grep "Jenkins MapD"` ]]; then

 echo "Ignoring superfluous build spawned by jenkins"

else

  # remove the previous temp branch
  echo "Removing the old temp branch"
  git branch -d temp

  # checkout a new temp branch
  echo "Checking out a new temp branch"
  git checkout -b temp

  # bump the version
  # TODO: set major, minor, or patch some how
  echo "Bumping the version number"
  npm --no-git-tag-version version patch

  # push the new version to github
  echo "Pushing up to master"
  git push origin temp:master

  # publish the module to npm
  echo "Publishing to npm"
  npm publish

  echo "Done!"

fi

