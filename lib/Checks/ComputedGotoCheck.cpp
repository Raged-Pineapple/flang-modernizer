#include "Checks/ComputedGotoCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct ComputedGotoVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::ComputedGotoStmt &) {
    std::cout << "[modernize-avoid-computed-goto] Computed GOTO is deleted in Fortran 95; replace with SELECT CASE\n";
  }
};
void ComputedGotoCheck::Walk(const Fortran::parser::Program &prog,
                             const Fortran::parser::AllCookedSources &cooked) {
  ComputedGotoVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
