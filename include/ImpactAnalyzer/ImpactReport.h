#pragma once
#include "llvm/ADT/StringRef.h"
#include "llvm/ADT/SmallVector.h"
#include <string>

namespace modernizer {
enum class Safety { Safe, ReviewNeeded, Risky };
enum class Effort { Trivial, Moderate, Complex };
enum class LegacyPattern {
  FixedForm, ArithmeticIf, ComputedGoto, ImplicitTyping,
  StmtFunction, EntryStmt, AssumedSize, Equivalence, CommonBlock
};

struct ImpactReport {
  LegacyPattern pattern;
  Safety safety;
  Effort effort;
  unsigned affectedFiles;
  llvm::SmallVector<std::string, 4> affectedFileList;
  llvm::SmallVector<std::string, 4> dependentConstructs;
  std::string rationale;
  std::string suggestedAction;
};
} // namespace modernizer
