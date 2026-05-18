#!/bin/bash

# run_tests.sh - Regression test suite for Flang Modernizer

# Locate the tool binary
TOOL_BIN="$(dirname "$0")/../build/tools/flang-modernizer/flang-modernizer"
if [ ! -f "$TOOL_BIN" ]; then
    echo "Error: flang-modernizer binary not found at $TOOL_BIN"
    echo "Please build the project first."
    exit 1
fi

UPDATE_EXPECTED=0
if [ "$1" == "--update" ] || [ "$1" == "-u" ]; then
    UPDATE_EXPECTED=1
    echo "Updating .expected baseline files..."
fi

TEST_DIR="$(dirname "$0")/legacy"
FAILED=0
PASSED=0

run_test() {
    local test_name="$1"
    local expected_file="$TEST_DIR/${test_name}.expected"
    shift
    local input_files=("$@")

    # Run the tool and capture output
    local actual_output
    actual_output=$("$TOOL_BIN" "${input_files[@]}" 2>&1)

    if [ $UPDATE_EXPECTED -eq 1 ]; then
        echo "$actual_output" > "$expected_file"
        echo "  Updated $expected_file"
        return 0
    fi

    if [ ! -f "$expected_file" ]; then
        echo "FAIL: $test_name - Missing .expected file. Run with --update to generate it."
        ((FAILED++))
        return 1
    fi

    # Compare output
    if echo "$actual_output" | diff -u "$expected_file" - > /dev/null; then
        echo "PASS: $test_name"
        ((PASSED++))
    else
        echo "FAIL: $test_name - Output differs from baseline!"
        echo "--- Expected ---"
        cat "$expected_file"
        echo "--- Actual ---"
        echo "$actual_output"
        echo "----------------"
        ((FAILED++))
    fi
}

echo "=== Running Single-File Tests ==="
# Find all single .f test files excluding the multi-file common components
for file in "$TEST_DIR"/*.f; do
    filename=$(basename -- "$file")
    if [[ "$filename" == "common1.f" || "$filename" == "common2.f" || "$filename" == "common3.f" ]]; then
        continue # Handled in multi-file test
    fi
    test_name="${filename%.*}"
    run_test "$test_name" "$file"
done

echo "=== Running Multi-File Tests ==="
# Test cross-file semantic analysis
run_test "multi_common" "$TEST_DIR/common1.f" "$TEST_DIR/common2.f" "$TEST_DIR/common3.f"

echo "================================"
if [ $UPDATE_EXPECTED -eq 1 ]; then
    echo "Baseline generation complete."
else
    echo "Test Summary: $PASSED passed, $FAILED failed."
    if [ $FAILED -gt 0 ]; then
        exit 1
    fi
fi
exit 0
