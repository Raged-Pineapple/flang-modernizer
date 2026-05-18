#include "Checks/CommonBlockCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct CommonBlockVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::CommonStmt &) {
    std::cout << "[modernize-avoid-common-block] COMMON blocks prevent encapsulation; replace with MODULE variables\n";
  }
};
void CommonBlockCheck::Walk(const Fortran::parser::Program &prog,
                            const Fortran::parser::AllCookedSources &cooked) {
  CommonBlockVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
