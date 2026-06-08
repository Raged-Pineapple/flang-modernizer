#include "Checks/EntryCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct EntryVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit EntryVisitor(const Fortran::parser::AllCookedSources &c)
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

  void Post(const Fortran::parser::EntryStmt &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-entry] "
              << "ENTRY statements are deleted in Fortran 2018; "
              << "refactor into separate subprograms\n";
  }
};

void EntryCheck::Walk(const Fortran::parser::Program &prog,
                      const Fortran::parser::AllCookedSources &cooked) {
  EntryVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
