# Flang Modernizer — Demo & Usage Guide

> A multi-phase Fortran legacy code analysis tool built on LLVM 20's Flang compiler infrastructure.
> Detects 9 anti-patterns, performs cross-file semantic analysis, and generates a prioritized safety-scored modernization report.

---

## Prerequisites

```bash
# Verify LLVM 20 / Flang toolchain is installed
flang-new-20 --version
clang++-20 --version

# Verify build tools
cmake --version   # >= 3.20
ninja --version
```

---

## Build

```bash
cd ~/flang-modernizer
mkdir -p build && cd build
cmake .. -G Ninja \
  -DCMAKE_C_COMPILER=clang-20 \
  -DCMAKE_CXX_COMPILER=clang++-20

ninja -j1   # -j1 to stay within WSL memory limits
```

**What this does:**
- Compiles the full static analysis pipeline against LLVM 20 / Flang headers
- Links 8+ Flang/LLVM static libraries in the correct dependency order
- Produces a single binary: `build/tools/flang-modernizer/flang-modernizer`

---

## Demo Script

Run these in order to demonstrate each capability of the tool.

---

### DEMO 1 — Phase 1: Single-File Legacy Pattern Detection

**Purpose:** Shows the tool detecting 9 distinct anti-patterns in a single Fortran 77 file.

```bash
# Detect COMMON blocks (global state anti-pattern)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/common_block.f
```

```bash
# Detect arithmetic IF (obsolescent branching)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/arith_if.f
```

```bash
# Detect computed GOTO (spaghetti control flow)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/computed_goto.f
```

```bash
# Detect EQUIVALENCE (unsafe type aliasing)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/equivalence.f
```

```bash
# Detect implicit typing (IMPLICIT NONE missing)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/implicit_typing.f
```

```bash
# Detect assumed-size arrays (DIMENSION(*) — prevents optimization)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/assumed_size.f
```

```bash
# Detect statement functions (obsolete inline functions)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/stmt_function.f
```

```bash
# Detect ENTRY statements (non-standard multi-entry subprograms)
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/entry_stmt.f
```

**What you see:**
Each run prints a diagnostic per finding, e.g.:
```
=== Analyzing common_block.f ===
[modernize-avoid-common-block] COMMON blocks prevent encapsulation; replace with MODULE variables
[modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form
```

> **Key point to explain:** Unlike a linter, this tool uses Flang's real parser (`Fortran::parser::Parsing`) — the same parser that compiles Fortran to LLVM IR. It therefore understands the full Fortran grammar, not just text patterns.

---

### DEMO 2 — Phase 1: Fixed-Form Detection (File-Level Heuristic)

**Purpose:** Shows that `.f` files are automatically detected as fixed-form (column-sensitive) Fortran 77 and flagged for conversion to free-form `.f90`.

```bash
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/arith_if.f
```

Notice `[modernize-avoid-fixed-form]` appears because the file ends in `.f`.

> **Key point:** Fixed-form Fortran requires code to start in column 7, uses column 6 for continuation markers, and column 1-5 for statement labels — a layout designed for punch cards. Free-form `.f90` is the modern standard.

---

### DEMO 3 — Phase 2: Multi-File Cross-File Semantic Indexing

**Purpose:** Shows the tool analyzing multiple files simultaneously and linking shared `COMMON` block declarations across them using Flang's full semantic analysis engine.

```bash
# Two consistent files — REAL declarations in both
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/common1.f \
  ~/flang-modernizer/test/legacy/common2.f
```

**Expected output (Symbol Index section):**
```
[Symbol Index Dump]
COMMON /physdat/
  - common1.f  signature: [REAL(4)|REAL(4)|]
  - common2.f  signature: [REAL(4)|REAL(4)|]
  OK: Consistent across all 2 file(s). Safe to modernize.
```

> **Key point to explain:** This uses `Fortran::semantics::Semantics` and `Fortran::semantics::SemanticsContext` — Flang's full semantic analysis pass — to resolve symbol scopes. The `COMMON` block `/PHYSDAT/` is stored in a *separate internal dictionary* (`scope.commonBlocks()`) from the regular symbol table, which required reading Flang's internal C++ headers to discover.

---

### DEMO 4 — Phase 2: Inconsistency Detection (Type Aliasing Risk)

**Purpose:** Shows the tool catching a dangerous cross-file mismatch: `common3.f` declares the same `COMMON` block with `INTEGER` instead of `REAL`.

```bash
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/common1.f \
  ~/flang-modernizer/test/legacy/common2.f \
  ~/flang-modernizer/test/legacy/common3.f
```

**Expected output:**
```
[Symbol Index Dump]
COMMON /physdat/
  - common1.f  signature: [REAL(4)|REAL(4)|]
  - common2.f  signature: [REAL(4)|REAL(4)|]
  - common3.f  signature: [INTEGER(4)|INTEGER(4)|]
  *** WARNING: Inconsistent declarations! Not safe to modernize automatically.
```

> **Key point:** This is why automated Fortran-to-Modern-Fortran transpilers fail in real HPC codebases. The same `COMMON /PHYSDAT/` is used for type-punning across compilation units. Detecting this requires cross-file semantic analysis — something no simple grep or regex tool can do.

---

### DEMO 5 — Phase 3: Prioritized Impact Report

**Purpose:** Shows the ranked, scored modernization report that tells a developer *what to fix first*.

The report appears automatically after every multi-file analysis run. Using the same 3-file command from Demo 4:

```bash
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/common1.f \
  ~/flang-modernizer/test/legacy/common2.f \
  ~/flang-modernizer/test/legacy/common3.f
```

**Expected output:**
```
========================================
  MODERNIZATION IMPACT REPORT
========================================
#   RISK      EFFORT FILES  SCORE   CONSTRUCT
----------------------------------------
1   UNSAFE    3      3      27      COMMON /physdat/
    -> Inconsistent declarations across 3 file(s) — type aliasing risk!
========================================
Total findings: 1
```

**Scoring formula:**
```
Priority Score = RiskLevel × AffectedFiles × EffortScore

RiskLevel:  SAFE=1, CAUTION=2, UNSAFE=3
Effort:     1=easy, 2=moderate, 3=requires manual type reconciliation
```

> **Key point:** A developer can immediately see `COMMON /physdat/` scores 27 = must fix manually before any modernization attempt. This prevents incorrect automated refactoring.

---

## Full Run (All Features in One Command)

```bash
~/flang-modernizer/build/tools/flang-modernizer/flang-modernizer \
  ~/flang-modernizer/test/legacy/arith_if.f \
  ~/flang-modernizer/test/legacy/computed_goto.f \
  ~/flang-modernizer/test/legacy/equivalence.f \
  ~/flang-modernizer/test/legacy/common1.f \
  ~/flang-modernizer/test/legacy/common2.f \
  ~/flang-modernizer/test/legacy/common3.f \
  ~/flang-modernizer/test/legacy/implicit_typing.f \
  ~/flang-modernizer/test/legacy/assumed_size.f \
  ~/flang-modernizer/test/legacy/stmt_function.f \
  ~/flang-modernizer/test/legacy/entry_stmt.f
```

This exercises all 3 phases simultaneously across 10 legacy Fortran files.

---

## Project Architecture

```
flang-modernizer/
├── include/
│   ├── Checks/          # 9 pattern detector headers (Phase 1)
│   ├── ImpactAnalyzer/  # SymbolIndex, UnionFind, ImpactReport (Phase 2)
│   └── Reporter/        # ImpactReporter (Phase 3)
├── lib/
│   ├── Checks/          # Pattern detector implementations
│   ├── ImpactAnalyzer/  # Cross-file semantic indexing
│   └── Reporter/        # Scoring and ranked output
├── tools/flang-modernizer/
│   └── main.cpp         # Driver: parser → checks → semantics → report
└── test/legacy/         # 10 Fortran 77 test files
```

### Technology Stack
| Layer | Technology |
|---|---|
| Parser | `Fortran::parser::Parsing` (Flang 20) |
| Semantic Analysis | `Fortran::semantics::Semantics` (Flang 20) |
| Symbol Table | `Fortran::semantics::Scope::commonBlocks()` |
| Build | CMake + Ninja, static linking against LLVM 20 |
| Language | C++17 |

---

## Key Technical Challenges Solved

1. **Static Linker Dependency Order** — LLVM's static libraries require exact ordering: `FortranSemantics → FortranEvaluate → FortranParser → FortranDecimal → LLVMFrontendOpenMP → LLVMFrontendOpenACC`. Wrong order = 100s of undefined symbol errors.

2. **Hidden `COMMON` Block Storage** — Discovered via reading Flang's internal headers that `COMMON` blocks are stored in a *separate* `scope.commonBlocks()` map, not the main symbol iterator. Standard symbol traversal misses them entirely.

3. **`DeclTypeSpec::AsFortran()` API** — In Flang 20, this returns `std::string` directly with zero arguments. Documentation/examples online show older incompatible signatures.

4. **WSL Terminal Corruption** — Multi-line C++ code pasted via terminal gets corrupted. Solved by writing all source files to the Windows `D:\` drive and using `cp /mnt/d/...` to transfer safely into WSL.
