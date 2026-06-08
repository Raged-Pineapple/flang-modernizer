#include "Checks/StmtFunctionCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct StmtFunctionVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit StmtFunctionVisitor(const Fortran::parser::AllCookedSources &c)
      : cooked(c) {}

  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}

  template <typename A>
  bool Pre(const Fortran::parser::Statement<A> &stmt) {
    if (auto range = cooked.GetSourcePositionRange(stmt.source)) {
      currentLine = range->first.line;
    }
    return true;
  }

  void Post(const Fortran::parser::StmtFunctionStmt &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-stmt-function] "
              << "Statement functions are deleted in Fortran 95; "
              << "move to CONTAINS section\n";
  }
};

void StmtFunctionCheck::Walk(
    const Fortran::parser::Program &prog,
    const Fortran::parser::AllCookedSources &cooked) {
  StmtFunctionVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
