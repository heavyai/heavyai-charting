#!/bin/bash

# If the last commit was from jenkins, do nothing
if [[ `git log -1 | grep "Jenkins MapD"` ]]; then

 echo "Ignoring superfluous build spawned by jenkins" 

else

  # checkout a new branch
  git checkout -b temp

  cd ..

  # bump the version
  # TODO: set major, minor, or patch some how
  npm --no-git-tag-version version patch

  # push the new version to github
  git push origin temp:master

  # remove the temp branch
  git branch -d temp

fi

