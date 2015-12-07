
#!/bin/bash

# Loop over the log and check for the newest semvar tag
i=0;
while read commit; do

        i=$(($i+1))

        # Parse the commit
        HASH=`echo $commit | cut -d '|' -f1`
        MESSAGE=`echo $commit | cut -d '|' -f2`

        # Print out the commit
        echo $i. $'\t' $HASH $MESSAGE

        # Check the commit for semvar tag
        SEM_VAR=$(echo $MESSAGE \
                | grep -o '\[\(patch\|major\|minor\)\]')

        # Set semvar tag to variable
        if [ "$SEM_VAR" ]; then
                SEM_VAR_TAG=$(echo $SEM_VAR \
                        | grep -o '\(patch\|major\|minor\)')
                break
        fi


done < <( git log --pretty="%H|%s" --skip=1 )

#print the variable
echo $SEM_VAR_TAG
