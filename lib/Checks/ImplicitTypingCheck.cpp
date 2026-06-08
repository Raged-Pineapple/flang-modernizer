#include "Checks/ImplicitTypingCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>
#include <variant>

namespace modernizer {

struct ImplicitTypingVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit ImplicitTypingVisitor(const Fortran::parser::AllCookedSources &c)
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

  void Post(const Fortran::parser::ImplicitStmt &node) {
    if (std::holds_alternative<std::list<Fortran::parser::ImplicitSpec>>(
            node.u)) {
      std::cout << "line " << currentLine
                << ": [modernize-require-implicit-none] "
                << "Explicit IMPLICIT typing found; "
                << "add IMPLICIT NONE and declare all variables\n";
    }
  }
};

void ImplicitTypingCheck::Walk(
    const Fortran::parser::Program &prog,
    const Fortran::parser::AllCookedSources &cooked) {
  ImplicitTypingVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
