#!/bin/bash
# ===========================================================
# run_complex_tests.sh
# Full test suite for complex legacy Fortran programs.
# Exercises all 9 anti-patterns across 4 realistic HPC codes
# and demonstrates both single-file and multi-file analysis.
# ===========================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOL_BIN="$SCRIPT_DIR/../build/tools/flang-modernizer/flang-modernizer"
COMPLEX_DIR="$SCRIPT_DIR/complex_tests"

SEP="============================================================"
SEP2="------------------------------------------------------------"

if [ ! -f "$TOOL_BIN" ]; then
    echo "ERROR: flang-modernizer binary not found at $TOOL_BIN"
    echo "       Run ./build.sh first."
    exit 1
fi

echo ""
echo "$SEP"
echo "  FLANG MODERNIZER - COMPLEX TEST SUITE"
echo "  Covering all 9 anti-patterns on realistic HPC Fortran"
echo "$SEP"
echo ""

# ===========================================================
# TEST 1: hpc_solver.f (all 8 patterns in one file)
# ===========================================================
echo ">>> TEST 1: HPC Linear Solver"
echo "    Patterns: implicit typing, COMMON, EQUIVALENCE, stmt funcs,"
echo "              arithmetic IF, computed GOTO, assumed-size, fixed-form"
echo "$SEP"
"$TOOL_BIN" "$COMPLEX_DIR/hpc_solver.f"
echo ""

# ===========================================================
# TEST 2: weather_sim.f (ENTRY statements, consistent COMMON)
# ===========================================================
echo ">>> TEST 2: Atmospheric Weather Simulation"
echo "    Patterns: implicit, COMMON (consistent), ENTRY (3 entry points),"
echo "              arithmetic IF, assumed-size, fixed-form"
echo "$SEP"
"$TOOL_BIN" "$COMPLEX_DIR/weather_sim.f"
echo ""

# ===========================================================
# TEST 3: material_props.f (EQUIVALENCE, statement functions)
# ===========================================================
echo ">>> TEST 3: Engineering Material Properties Library"
echo "    Patterns: implicit, COMMON (consistent), EQUIVALENCE,"
echo "              4 statement functions, arithmetic IF, assumed-size"
echo "$SEP"
"$TOOL_BIN" "$COMPLEX_DIR/material_props.f"
echo ""

# ===========================================================
# TEST 4: fluid_cfd.f (INCONSISTENT COMMON -- the danger file)
# ===========================================================
echo ">>> TEST 4: CFD Navier-Stokes Solver (INCONSISTENT COMMON)"
echo "    Patterns: ALL 9 -- note /PHYSDAT/ variable ORDER is swapped"
echo "    Single-file: appears fine. Multi-file: triggers UNSAFE!"
echo "$SEP"
"$TOOL_BIN" "$COMPLEX_DIR/fluid_cfd.f"
echo ""

# ===========================================================
# TEST 5: Multi-file -- CONSISTENT (3 safe files together)
# ===========================================================
echo ">>> TEST 5: Multi-File Cross-Analysis -- SAFE (3 files)"
echo "    Files: hpc_solver.f + weather_sim.f + material_props.f"
echo "    Expected: /PHYSDAT/ SAFE -- consistent across all 3 files"
echo "$SEP"
"$TOOL_BIN" \
    "$COMPLEX_DIR/hpc_solver.f" \
    "$COMPLEX_DIR/weather_sim.f" \
    "$COMPLEX_DIR/material_props.f"
echo ""

# ===========================================================
# TEST 6: Multi-file -- INCONSISTENT (add fluid_cfd.f)
# ===========================================================
echo ">>> TEST 6: Multi-File Cross-Analysis -- UNSAFE (all 4 files)"
echo "    Files: all 4, including fluid_cfd.f"
echo "    Expected: /PHYSDAT/ UNSAFE -- fluid_cfd.f has swapped types!"
echo "$SEP"
"$TOOL_BIN" \
    "$COMPLEX_DIR/hpc_solver.f" \
    "$COMPLEX_DIR/weather_sim.f" \
    "$COMPLEX_DIR/material_props.f" \
    "$COMPLEX_DIR/fluid_cfd.f"
echo ""

echo "$SEP"
echo "  All complex tests complete."
echo "  - Tests 1-4:  Single-file pattern detection"
echo "  - Test 5:     Multi-file SAFE COMMON block analysis"
echo "  - Test 6:     Multi-file UNSAFE COMMON block analysis"
echo "$SEP"
echo ""
