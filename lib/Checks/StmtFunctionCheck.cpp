#include "Checks/StmtFunctionCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct StmtFunctionVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::StmtFunctionStmt &) {
    std::cout << "[modernize-avoid-stmt-function] Statement functions are deleted in Fortran 95; move to CONTAINS section\n";
  }
};
void StmtFunctionCheck::Walk(const Fortran::parser::Program &prog,
                             const Fortran::parser::AllCookedSources &cooked) {
  StmtFunctionVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
