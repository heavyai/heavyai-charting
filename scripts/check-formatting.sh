#!/usr/bin/env bash

# This script basically just runs `prettier`, but it adds a header and footer so that people aren't
# confused why their CI builds failed, since prettier's output is less-than-helpful.

echo -e "=====> Checking code formatting\n"

prettier --list-different '{src,test}/**/*.js'

PRETTIER_RES=$?

if [[ $PRETTIER_RES -ne 0 ]]; then
    echo -e "\n!!! FATAL ERROR: The above files have formatting problems. Run \`npm run format\` to fix.\n\n"
else
    echo -e "---> No code formatting problems found\n\n"
fi

exit $PRETTIER_RES