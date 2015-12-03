#!/bin/bash

# If the last commit was from jenkins, do nothing
if [[ `git log -1 | grep "Jenkins MapD"` ]]; then

 echo "Ignoring superfluous build spawned by jenkins" 

else

  # bump the version
  # TODO: set major, minor, or patch some how
  npm --no-git-tag-version version --patch

  # add and commit the new version
  git commit -a -m "`sh package_version.sh`"

  git push origin master

fi

