# Flang Modernizer — Live Demonstration Guide

This guide is designed to help you present the `flang-modernizer` project during a live demonstration. It highlights the underlying technical complexity of the tool, proving it is not just a text-based regex script, but a true compiler-frontend analysis tool.

---

## Preparation Before Demo

Ensure the tool is built and you are in the project root:
```bash
cd ~/flang-modernizer
cd build && ninja -j1 && cd ..
```

---

## 🟢 Demo 1: The Basics — Pattern Detection
*Goal: Show that the tool correctly identifies standard legacy Fortran anti-patterns using the LLVM parse tree.*

**The Command:**
```bash
build/tools/flang-modernizer/flang-modernizer test/legacy/computed_goto.f
```

**What to explain to the audience:**
1. "Here we see the tool analyzing a file and finding a `Computed GOTO` statement."
2. "Under the hood, this isn't using `grep` or regex. The file is being fed into `Fortran::parser::Parsing`. The tool constructs a full LLVM Parse Tree and uses the `Fortran::parser::Walk` visitor pattern to traverse the AST."
3. "Because it uses a real compiler frontend, it perfectly handles Fortran's complex syntax rules (like ignoring whitespace or handling line continuations) that break simple regex tools."

---

## 🟡 Demo 2: File-Level Heuristics
*Goal: Show that the tool combines AST traversal with file-level context.*

**The Command:**
```bash
build/tools/flang-modernizer/flang-modernizer test/legacy/arith_if.f
```

**What to explain to the audience:**
1. "Notice the second warning: `[modernize-avoid-fixed-form]`. The tool detected that this is a `.f` file, meaning it relies on Fortran 77's rigid, punch-card column formatting."
2. "The tool automatically flags this for conversion to free-form `.f90` source code, which is the prerequisite for modern Fortran development."

---

## 🟠 Demo 3: Cross-File Semantic Analysis (The Hard Part)
*Goal: Demonstrate the Phase 2 Impact Analyzer mapping symbols across multiple compilation units.*

**The Command:**
```bash
build/tools/flang-modernizer/flang-modernizer test/legacy/common1.f test/legacy/common2.f
```

**What to explain to the audience:**
1. "Now things get complex. We pass two separate files that both define a `COMMON /physdat/` block."
2. "The tool executes Flang's full semantic pass (`Fortran::semantics::Semantics`). It builds a global scope, extracts the variable types from the AST, and builds a canonical type signature (e.g., `REAL(4)|REAL(4)|`)."
3. "Look at the `[Symbol Index Dump]`. It successfully linked the `COMMON` block across the two files and verified that the memory layout is identical. It reports: **Safe to modernize**."

---

## 🔴 Demo 4: Detecting Type Aliasing Risk
*Goal: Show how the tool prevents dangerous, automated refactoring that would break the codebase.*

**The Command:**
```bash
build/tools/flang-modernizer/flang-modernizer test/legacy/common1.f test/legacy/common2.f test/legacy/common3.f
```

**What to explain to the audience:**
1. "I just added `common3.f` to the mix. In this file, a developer long ago maliciously (or accidentally) defined the exact same `COMMON /physdat/` block, but used `INTEGER` instead of `REAL`."
2. "This is a classic Fortran 77 trick called 'type punning' or 'type aliasing'."
3. "If a transpiler automatically converted this to a Fortran 90 `MODULE`, the compiled program would crash or produce silent numerical errors."
4. "Our tool catches this. It compares the type signatures across all files, sees the mismatch (`INTEGER` vs `REAL`), and throws a `*** WARNING: Inconsistent declarations!`"

---

## 🟣 Demo 5: The Prioritized Impact Report
*Goal: Show the final deliverable (Phase 3) that ranks modernization tasks by urgency and risk.*

**The Command:** *(Same as Demo 4, but focus on the final table output)*
```bash
build/tools/flang-modernizer/flang-modernizer test/legacy/common1.f test/legacy/common2.f test/legacy/common3.f
```

**What to explain to the audience:**
1. "At the very bottom, we see the **Modernization Impact Report**."
2. "This is designed for Project Managers and Lead Engineers. It scores every construct based on a formula: `Risk × Affected Files × Effort`."
3. "Because our inconsistent `COMMON` block affects 3 files and represents a major type aliasing risk, it gets a massive Priority Score of 27."
4. "This tells the engineering team exactly what they must manually fix first before applying any automated transformations."

---

## 🔵 Demo 6: Real-World Case Study (LAPACK)
*Goal: Prove the tool works on actual production HPC code, not just toy examples.*

**The Command:**
```bash
build/tools/flang-modernizer/flang-modernizer case_study/lapack/dgetrf.f case_study/lapack/dgemm.f case_study/lapack/ilaenv.f
```

**What to explain to the audience:**
1. "Finally, we ran the tool on raw, unmodified source files from the official LAPACK linear algebra library."
2. "The tool successfully parsed these massive files using LLVM and immediately identified the exact anti-patterns dragging them down (e.g., Assumed-size arrays `(*)` preventing loop optimizations, and deleted `Computed GOTO` statements)."
3. "This proves the tool is robust enough to handle the complexities of one of the most famous scientific computing libraries in the world."
