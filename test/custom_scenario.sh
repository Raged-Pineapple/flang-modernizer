#!/bin/bash
# ===========================================================
# custom_scenario.sh  --  USER-CONFIGURABLE TEST SCENARIO
# ===========================================================
#
# PURPOSE:
#   Run a custom selection of Fortran files through the
#   flang-modernizer and see the combined impact report.
#
# HOW TO USE (the "run / change / run again" workflow):
#   1. Run once:       bash test/custom_scenario.sh
#      Note the COMMON block safety rating and score.
#
#   2. Make ONE of these changes in the CONFIGURATION section:
#
#      EXPERIMENT A: Toggle the "danger" file
#        Comment/uncomment the fluid_cfd.f line.
#        Effect: /PHYSDAT/ flips between SAFE and UNSAFE!
#
#      EXPERIMENT B: Change the analysis mode
#        Set MODE="verbose" or MODE="summary"
#        Effect: output format changes.
#
#      EXPERIMENT C: Add your own Fortran file
#        Put a .f file in test/complex_tests/ and add its path.
#        Effect: new patterns and COMMON block entries appear.
#
#   3. Run again:      bash test/custom_scenario.sh
#      Observe how the Modernization Impact Report changes.
#
# ===========================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOL_BIN="$SCRIPT_DIR/../build/tools/flang-modernizer/flang-modernizer"
COMPLEX_DIR="$SCRIPT_DIR/complex_tests"

# ===========================================================
#  CONFIGURATION SECTION  --  EDIT THIS TO CHANGE RESULTS
# ===========================================================

# Title for this scenario (change to label your experiment)
SCENARIO_TITLE="Baseline: 3-file safe configuration"

# Files to analyze.
# *** KEY EXPERIMENT ***
# Uncomment fluid_cfd.f to flip /PHYSDAT/ from SAFE -> UNSAFE!
FILES_TO_ANALYZE=(
    "$COMPLEX_DIR/hpc_solver.f"
    "$COMPLEX_DIR/weather_sim.f"
    "$COMPLEX_DIR/material_props.f"
    # "$COMPLEX_DIR/fluid_cfd.f"     # <-- UNCOMMENT to see UNSAFE!
)

# Analysis mode: "normal" or "verbose"
# In verbose mode we print file list and a separator for each.
MODE="verbose"

# ===========================================================
#  END OF CONFIGURATION -- do not edit below this line
# ===========================================================

if [ ! -f "$TOOL_BIN" ]; then
    echo "ERROR: tool not found at $TOOL_BIN  (run ./build.sh first)"
    exit 1
fi

NFILES="${#FILES_TO_ANALYZE[@]}"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

echo ""
echo "==========================================================="
echo "  CUSTOM SCENARIO: $SCENARIO_TITLE"
echo "  Timestamp : $TIMESTAMP"
echo "  Files     : $NFILES"
echo "==========================================================="
echo ""

if [ "$MODE" = "verbose" ]; then
    echo "  Files selected for analysis:"
    for F in "${FILES_TO_ANALYZE[@]}"; do
        echo "    + $(basename "$F")"
    done
    echo ""
    echo "-----------------------------------------------------------"
    echo "  TIP: To change results, edit the CONFIGURATION section:"
    echo "    - Uncomment fluid_cfd.f  => /PHYSDAT/ becomes UNSAFE"
    echo "    - Comment out files      => fewer findings, lower scores"
    echo "    - Add your own .f file   => new patterns appear"
    echo "-----------------------------------------------------------"
    echo ""
fi

"$TOOL_BIN" "${FILES_TO_ANALYZE[@]}"
EXITCODE=$?

echo ""
echo "==========================================================="
echo "  Scenario complete. Exit code: $EXITCODE"
if [ "$NFILES" -lt 4 ]; then
    echo ""
    echo "  >>> Try uncommenting fluid_cfd.f in this script and"
    echo "      running again. The /PHYSDAT/ COMMON block will"
    echo "      change from SAFE to UNSAFE due to type mismatch!"
fi
echo "==========================================================="
echo ""
