#include "Checks/EntryCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct EntryVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}
  void Post(const Fortran::parser::EntryStmt &) {
    std::cout << "[modernize-avoid-entry] ENTRY statements are deleted in Fortran 2018; refactor into separate subprograms\n";
  }
};
void EntryCheck::Walk(const Fortran::parser::Program &prog,
                      const Fortran::parser::AllCookedSources &cooked) {
  EntryVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
