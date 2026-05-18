# Implementation Details

Building a static analysis tool atop LLVM 20's Fortran frontend (Flang) requires navigating undocumented APIs and strict static linking requirements.

## Key API Integrations

### 1. The Parser and AST Visitor
To perform syntactic checks, we initialize `Fortran::parser::Parsing`.
```cpp
auto &parseTree = *parsing.parseTree();
modernizer::ArithmeticIfCheck check;
check.Walk(parseTree, allCookedSources);
```
Each check implements a `Post()` method targeted at specific AST node types (e.g., `void Post(const Fortran::parser::ArithmeticIfStmt &)`). This ensures we only trigger logic on successfully parsed semantic constructs.

### 2. Semantic Context and Scope Traversal
To map symbols across files, we had to run Flang's full semantic pipeline:
```cpp
Fortran::semantics::SemanticsContext semCtx(defaultKinds, features, langOptions, allCooked);
Fortran::semantics::Semantics semantics(semCtx, parseTree);
semantics.Perform();
```
**Challenge Solved:** We discovered by reading LLVM header files that `COMMON` blocks are *not* stored in the main symbol table iterator. They are maintained in a separate internal dictionary accessible via `scope.commonBlocks()`. 

### 3. Type Signature Extraction
To compare memory layouts, we utilized Flang's `DeclTypeSpec` API. In LLVM 20, we use `type->AsFortran()` (which returns a `std::string` with no arguments) to generate strings like `REAL(4)` or `INTEGER(4)`. We concatenate these to form a block's cross-file signature.

## Build and Linker Challenges Solved

### Static Library Ordering
LLVM static libraries must be linked in exact dependency order, otherwise the linker throws hundreds of "undefined reference" errors. We resolved this in our `CMakeLists.txt` by strictly ordering the Flang libraries:
`FortranSemantics -> FortranEvaluate -> FortranParser -> FortranDecimal -> LLVMFrontendOpenMP -> LLVMFrontendOpenACC -> LLVMSupport`.

### Endianness Macro
Flang headers require endianness to be explicitly defined. We injected `-DFLANG_LITTLE_ENDIAN=1` into the CMake compile flags to prevent compilation failures deep within `flang/Common/idioms.h`.
