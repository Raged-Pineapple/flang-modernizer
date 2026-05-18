#include "Checks/EquivalenceCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct EquivalenceVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::EquivalenceStmt &) {
    std::cout << "[modernize-avoid-equivalence] EQUIVALENCE creates unsafe aliasing; replace with explicit variables\n";
  }
};
void EquivalenceCheck::Walk(const Fortran::parser::Program &prog,
                            const Fortran::parser::AllCookedSources &cooked) {
  EquivalenceVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
