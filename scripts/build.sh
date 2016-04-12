./node_modules/grunt-cli/bin/grunt | tee build_output.txt
grep -q -i 'Done, without errors.' build_output.txt
if [ "$?" == "0" ]; then
    rm build_output.txt
    exit 0
fi
exit 1
