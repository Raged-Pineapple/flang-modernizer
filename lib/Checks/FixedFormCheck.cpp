#include "Checks/FixedFormCheck.h"
#include <iostream>
namespace modernizer {
void FixedFormCheck::Walk(const Fortran::parser::Program &prog,
                          const Fortran::parser::AllCookedSources &cooked) {
  if (isFixedForm_) {
    std::cout << "[modernize-avoid-fixed-form] Fixed-form source (column-sensitive) detected; convert to free-form\n";
  }
}
} // namespace modernizer
