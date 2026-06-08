#include "Checks/CommonBlockCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct CommonBlockVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit CommonBlockVisitor(const Fortran::parser::AllCookedSources &c)
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

  void Post(const Fortran::parser::CommonStmt &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-common-block] "
              << "COMMON blocks prevent encapsulation; "
              << "replace with MODULE variables\n";
  }
};

void CommonBlockCheck::Walk(const Fortran::parser::Program &prog,
                            const Fortran::parser::AllCookedSources &cooked) {
  CommonBlockVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
