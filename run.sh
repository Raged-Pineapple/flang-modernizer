#!/bin/bash
# run.sh - Wrapper script to execute the flang-modernizer

set -e

TOOL_BIN="$(dirname "$0")/build/tools/flang-modernizer/flang-modernizer"

if [ ! -f "$TOOL_BIN" ]; then
    echo "Error: flang-modernizer executable not found!"
    echo "Please run ./build.sh first."
    exit 1
fi

if [ "$#" -eq 0 ]; then
    echo "Usage: ./run.sh <file1.f> [file2.f ...]"
    exit 1
fi

# Execute the tool with all provided arguments
"$TOOL_BIN" "$@"
