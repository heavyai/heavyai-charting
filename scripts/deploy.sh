#!/bin/bash

# If the last commit was from jenkins, do nothing
if [[ `git log -1 | grep "Jenkins MapD"` ]]; then

 echo "Ignoring superfluous build spawned by jenkins" 

else

  # remove the previous temp branch
  git branch -d temp

  # checkout a new temp branch
  git checkout -b temp

  # back out to be adjacent to the package.json file
  cd ..

  # bump the version
  # TODO: set major, minor, or patch some how
  npm --no-git-tag-version version patch

  # push the new version to github
  git push origin temp:master

fi

