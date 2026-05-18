#include "Checks/AssumedSizeCheck.h"
#include "flang/Parser/parse-tree-visitor.h"
#include <iostream>
namespace modernizer {
struct AssumedSizeVisitor {
  template <typename A> bool Pre(const A &) { return true; }
  template <typename A> void Post(const A &) {}

  // REAL A(1,*) — explicit shape spec list + * — unambiguously assumed-size
  void Post(const Fortran::parser::AssumedSizeSpec &) {
    std::cout << "[modernize-avoid-assumed-size] Assumed-size dummy(*) prevents optimization; use explicit or assumed-shape\n";
  }
  // REAL A(*) — single * with no preceding shape — ambiguous at parse time;
  // could be assumed-size dummy arg OR implied-shape named constant.
  // We flag it; false positives on PARAMETER arrays are acceptable.
  void Post(const Fortran::parser::ImpliedShapeSpec &) {
    std::cout << "[modernize-avoid-assumed-size] Assumed-size dummy(*) prevents optimization; use explicit or assumed-shape\n";
  }
};
void AssumedSizeCheck::Walk(const Fortran::parser::Program &prog,
                            const Fortran::parser::AllCookedSources &cooked) {
  AssumedSizeVisitor v; Fortran::parser::Walk(prog, v);
}
} // namespace modernizer
