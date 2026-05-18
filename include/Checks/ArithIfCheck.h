#pragma once
#include "flang/Parser/parse-tree.h"
#include "flang/Parser/parsing.h"

namespace modernizer {

struct ArithIfCheck {
  void Walk(const Fortran::parser::Program &program,
            const Fortran::parser::AllCookedSources &allCooked);
};

} // namespace modernizer
