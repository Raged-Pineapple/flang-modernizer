#include "Checks/ImplicitTypingCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
#include <variant>
namespace modernizer {
struct ImplicitTypingVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::ImplicitStmt &node) {
    if (std::holds_alternative<std::list<Fortran::parser::ImplicitSpec>>(node.u)) {
      std::cout << "[modernize-require-implicit-none] Explicit IMPLICIT typing found; add IMPLICIT NONE and declare all variables\n";
    }
  }
};
void ImplicitTypingCheck::Walk(const Fortran::parser::Program &prog,
                               const Fortran::parser::AllCookedSources &cooked) {
  ImplicitTypingVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
