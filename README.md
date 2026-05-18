# Flang Modernizer

A multi-phase Fortran legacy code static analysis and modernization advisor, built directly on the **LLVM 20 Flang compiler frontend**.

## What It Does
The `flang-modernizer` is not a simple regex-based linter. It uses real compiler infrastructure (AST traversal and semantic scope linking) to:
1. Detect 9 distinct legacy Fortran 77 anti-patterns.
2. Analyze `COMMON` block consistency across multiple source files simultaneously (preventing type aliasing).
3. Generate a prioritized **Modernization Impact Report** scored by risk and effort, guiding engineers on what to fix first before automated transpilation.

## Repository Structure
- **`src` / `include` / `lib`**: The C++ source code for the tool, split into `Checks` (Phase 1), `ImpactAnalyzer` (Phase 2), and `Reporter` (Phase 3).
- **`tools/flang-modernizer`**: The main executable entry point.
- **`testcases` / `test/legacy`**: Fortran 77 files with known legacy patterns, used by the regression test suite.
- **`case_study`**: Real-world legacy files from the LAPACK scientific computing library.

## Dependencies
- LLVM 20 (including Flang-new and LLVM-dev headers)
- Clang++ 20
- CMake (>= 3.20)
- Ninja Build System
- Linux Environment (e.g., WSL2 Ubuntu)

## How to Build
Use the provided wrapper script:
```bash
./build.sh
```

## How to Run
Use the provided wrapper script and pass one or more Fortran files:
```bash
./run.sh test/legacy/computed_goto.f
./run.sh test/legacy/common1.f test/legacy/common2.f test/legacy/common3.f
```

## Testing
To run the automated diff-based regression suite against baseline files:
```bash
bash test/run_tests.sh
```

## Further Documentation
Please refer to the following documents for project details:
- **`DESIGN.md`**: Architecture and design decisions.
- **`IMPLEMENTATION.md`**: Deep dive into LLVM/Flang integration.
- **`EVALUATION.md`**: Testing metrics and LAPACK case study results.
