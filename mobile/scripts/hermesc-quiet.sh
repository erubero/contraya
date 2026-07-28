#!/bin/bash
# Wrapper around hermesc that silences bytecode-compile warnings
# ("variable X was not declared", eval notes) in the main.jsbundle build
# phase. react-native-xcode.sh uses this when HERMES_CLI_PATH is exported
# (see ios/.xcode.env, written by plugins/withCleanXcodeBuild.js).
exec "$PODS_ROOT/hermes-engine/destroot/bin/hermesc" -w "$@"
