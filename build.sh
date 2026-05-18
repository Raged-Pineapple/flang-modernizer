#!/bin/bash
# build.sh - Wrapper script to build the flang-modernizer project

set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

echo "=== Building Flang Modernizer ==="
mkdir -p build
cd build

# Configure with CMake, explicitly using LLVM 20 compilers
cmake .. -G Ninja -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20

# Build the project (limiting jobs to 1 to prevent WSL memory exhaustion)
ninja -j1

echo "=== Build Complete ==="
echo "Executable located at: build/tools/flang-modernizer/flang-modernizer"
