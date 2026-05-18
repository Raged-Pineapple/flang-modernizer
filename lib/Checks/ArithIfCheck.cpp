#include "Checks/ArithIfCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>

namespace modernizer {

struct ArithIfVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}

  void Post(const Fortran::parser::ArithmeticIfStmt &node) {
    std::cout << "[modernize-avoid-arithmetic-if] "
              << "Arithmetic IF is deleted in Fortran 2018; "
              << "replace with IF-THEN-ELSE\n";
  }
};

void ArithIfCheck::Walk(const Fortran::parser::Program &program,
                        const Fortran::parser::AllCookedSources &allCooked) {
  ArithIfVisitor visitor;
  Fortran::parser::Walk(program, visitor);
}

} // namespace modernizer
