#include "Checks/AssumedSizeCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/provenance.h"
#include <iostream>

namespace modernizer {

struct AssumedSizeVisitor {
  const Fortran::parser::AllCookedSources &cooked;
  int currentLine{0};

  explicit AssumedSizeVisitor(const Fortran::parser::AllCookedSources &c)
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

  // REAL A(1,*) — explicit shape spec list + * — unambiguously assumed-size
  void Post(const Fortran::parser::AssumedSizeSpec &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-assumed-size] "
              << "Assumed-size dummy(*) prevents optimization; "
              << "use explicit or assumed-shape\n";
  }

  // REAL A(*) — single * with no preceding shape — ambiguous at parse time;
  // could be assumed-size dummy arg OR implied-shape named constant.
  // We flag it; false positives on PARAMETER arrays are acceptable.
  void Post(const Fortran::parser::ImpliedShapeSpec &) {
    std::cout << "line " << currentLine
              << ": [modernize-avoid-assumed-size] "
              << "Assumed-size dummy(*) prevents optimization; "
              << "use explicit or assumed-shape\n";
  }
};

void AssumedSizeCheck::Walk(
    const Fortran::parser::Program &prog,
    const Fortran::parser::AllCookedSources &cooked) {
  AssumedSizeVisitor v{cooked};
  Fortran::parser::Walk(prog, v);
}

} // namespace modernizer
