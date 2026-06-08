#include "Checks/ArithIfCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct ArithIfVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit ArithIfVisitor(const Fortran::parser::AllCookedSources &c)
      : cooked(c) {}

  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}

  // Capture source location from the Statement wrapper
  template <typename A>
  bool Pre(const Fortran::parser::Statement<A> &stmt) {
    if (auto range = cooked.GetSourcePositionRange(stmt.source)) {
      currentLine = range->first.line;
    }
    return true;
  }

  void Post(const Fortran::parser::ArithmeticIfStmt &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-arithmetic-if] "
              << "Arithmetic IF is deleted in Fortran 2018; "
              << "replace with IF-THEN-ELSE\n";
  }
};

void ArithIfCheck::Walk(const Fortran::parser::Program &program,
                        const Fortran::parser::AllCookedSources &allCooked) {
  ArithIfVisitor visitor{allCooked};
  Fortran::parser::Walk(program, visitor);
}

} // namespace modernizer
