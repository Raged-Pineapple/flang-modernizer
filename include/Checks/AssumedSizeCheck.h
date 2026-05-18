#pragma once
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/parsing.h"
namespace modernizer {
struct AssumedSizeCheck {
  void Walk(const Fortran::parser::Program &, const Fortran::parser::AllCookedSources &);
};
} // namespace modernizer
