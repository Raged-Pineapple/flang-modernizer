#include "Checks/ComputedGotoCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct ComputedGotoVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit ComputedGotoVisitor(const Fortran::parser::AllCookedSources &c)
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

  void Post(const Fortran::parser::ComputedGotoStmt &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-computed-goto] "
              << "Computed GOTO is deleted in Fortran 95; "
              << "replace with SELECT CASE\n";
  }
};

void ComputedGotoCheck::Walk(const Fortran::parser::Program &prog,
                             const Fortran::parser::AllCookedSources &cooked) {
  ComputedGotoVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
