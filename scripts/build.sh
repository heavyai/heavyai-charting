../../node_modules/grunt-cli/bin/grunt | tee build.log
if [ "${PIPESTATUS[0]}" != "0" ]; then exit 1; fi
