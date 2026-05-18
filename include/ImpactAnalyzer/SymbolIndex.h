#pragma once
#include "ImpactAnalyzer/UnionFind.h"
#include "ImpactAnalyzer/ImpactReport.h"
#include "flang/Semantics/semantics.h"
#include "flang/Semantics/symbol.h"
#include "llvm/ADT/StringMap.h"
#include "llvm/ADT/SmallVector.h"
#include <string>

namespace modernizer {

struct CommonBlockImpact {
  std::string blockName;
  unsigned affectedFiles = 0;
  llvm::SmallVector<std::string, 4> files;
  bool hasInconsistentDecls = false;
  bool hasTypeAliasingRisk = false;
};

class SymbolIndex {
  llvm::StringMap<llvm::SmallVector<std::string, 4>> commonBlockFiles;
public:
  void indexFile(llvm::StringRef path, Fortran::semantics::SemanticsContext &context);
  CommonBlockImpact analyzeCommonBlock(llvm::StringRef blockName) const;
  void dump() const;
};

} // namespace modernizer
