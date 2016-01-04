#!/bin/bash

# show the command being run
set -x

# tell jenkins to fail if any of the commands fail
set -e

echo PR TITLE: $ghprbPullTitle

# Check the PR title for semvar tag
SEM_VAR=$(echo $ghprbPullTitle \
    | awk '{print tolower($0)}' \
    | grep -o '\[\(patch\|major\|minor\)\]')
if [[ ${#SEM_VAR} > 1 ]]; then
    HAS_SEMVAR=true
else
    HAS_SEMVAR=false
fi

# print the semvar tag
echo BUMP LABEL: $SEM_VAR

# Exit with error if no semvar tag is present in the pull request
if [ "$HAS_SEMVAR" = false ]; then
    echo ERROR: No semvar tag specified in this pull request.
    exit 1
fi

