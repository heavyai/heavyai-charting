#!/bin/bash

# Parse out the sha1 of the first and last commit in the pull request
PR_STRING=$(git log --pretty=oneline -1  \
        | grep -o '[A-Za-z0-9]\{40\} into [A-Za-z0-9]\{40\}')
IFS=' into ' read FIRST_COMMIT LAST_COMMIT <<< $PR_STRING

# Loop over the log and check the pull request's commits for semvar tags
STARTED=false;
ENDED=false;
HAS_SEMVAR=false;
i=1;
while read commit; do

        # Parse the commit
        HASH=`echo $commit | cut -d '|' -f1`
        MESSAGE=`echo $commit | cut -d '|' -f2`

        # Check if the commit is a part of the pull request
        if [ "$HASH" == "$FIRST_COMMIT" ]; then
                STARTED=true
        elif [ "$HASH" == "$LAST_COMMIT" ]; then
                ENDED=true
        fi

        # Process the commits
        if [ "$STARTED" = true ] && [ "$ENDED" = false ]; then

                # Print out the commit
                echo $i. $'\t' $HASH $MESSAGE
                i=$(($i+1))

                # Check the commit for semvar tag
                SEM_VAR=$(echo $MESSAGE \
                        | grep -o '\[\(patch\|major\|minor\)\]')

                # error out on multiple semvars
                if [ "$HAS_SEMVAR" = true ] && [ "$SEM_VAR" ]; then
                        echo ERROR: Multiple semvar tags specified in this pull request.
                        exit 1
                elif [[ "$SEM_VAR" ]]; then
                        HAS_SEMVAR=true
                fi

        fi

        # Break the loop after the last commit is processed
        if [ "$ENDED" = true ]; then
            break;
        fi

done < <( git log --pretty="%H|%s" --skip=1 )

# Exit with error if no semvar tag is present in the pull request
if [ "$HAS_SEMVAR" = false ]; then
    echo ERROR: No semvar tag specified in this pull request.
    exit 1
fi

# print the semvar tag
SEM_VAR_TAG=$(echo $SEM_VAR \
        | grep -o '\(patch\|major\|minor\)')
echo $SEM_VAR_TAG

