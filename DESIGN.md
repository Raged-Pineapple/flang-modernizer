# Project Design

## Architecture Approach
The Flang Modernizer is split into three decoupled phases, designed to execute sequentially over an entire codebase:

### Phase 1: Syntactic Pattern Detection
The tool instantiates `Fortran::parser::Parsing` and uses the `Fortran::parser::Walk` visitor pattern to traverse the Abstract Syntax Tree (AST). We created 9 independent Check classes (e.g., `ArithmeticIfCheck`, `ComputedGotoCheck`). Because this operates on the AST, it perfectly handles Fortran's complex grammar rules, line continuations, and whitespace rules that break simple text parsers.

### Phase 2: Cross-File Semantic Impact Analyzer
Modernizing global state (like `COMMON` blocks) into Fortran 90 `MODULE`s requires cross-file knowledge. We designed a `SymbolIndex` class that is fed the output of `Fortran::semantics::SemanticsContext`.
- **Heuristic**: The tool extracts the types of variables within a `COMMON` block and serializes them into a canonical string signature (e.g., `[REAL(4)|REAL(4)|]`).
- It then compares this signature across all compilation units. If it detects `[REAL(4)|INTEGER(4)|]`, it flags the block as `UNSAFE` due to type aliasing.

### Phase 3: Prioritized Reporting
To guide engineering efforts, we designed a scoring formula:
`Priority Score = RiskLevel × AffectedFiles × EffortScore`
- **Risk Level**: UNSAFE (3), CAUTION (2), SAFE (1)
- **Effort Score**: Manual Fix Required (3), Moderate (2), Easy Automated Fix (1)

The tool outputs a formatted, ranked table, allowing developers to immediately tackle the highest-risk (highest-score) technical debt.

## Alternatives Considered

### 1. Regex/Python Scripting vs. LLVM AST
*Alternative:* Write a Python script using regular expressions to find `COMMON` blocks and `GOTO` statements.
*Decision:* Rejected. Fortran 77 allows arbitrary whitespace (e.g., `G O T O` is valid), complex line continuations, and lacks reserved keywords. Regex cannot accurately parse Fortran. We chose the steep learning curve of LLVM/Flang to guarantee compiler-accurate parsing.

### 2. Clang-Tidy Framework vs. Native Flang Driver
*Alternative:* Integrate directly into the existing `flang-tidy` framework.
*Decision:* Rejected for this specific assignment. The `flang-tidy` framework is highly constrained to single-file analysis. Because Phase 2 requires **cross-file** semantic memory layout comparisons, we opted to build a standalone standalone tool using Flang's core libraries directly.
