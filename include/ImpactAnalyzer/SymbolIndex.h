#pragma once
#include "ImpactAnalyzer/UnionFind.h"
#include "ImpactAnalyzer/ImpactReport.h"
#include "flang/Semantics/semantics.h"
#include "flang/Semantics/symbol.h"
#include "llvm/ADT/StringMap.h"
#include "llvm/ADT/SmallVector.h"
#include <string>
#include <vector>

namespace modernizer {

struct CommonBlockImpact {
  std::string blockName;
  unsigned affectedFiles = 0;
  llvm::SmallVector<std::string, 4> files;
  bool hasInconsistentDecls = false;
};

struct CommonBlockEntry {
  std::string filePath;
  std::string signature; // e.g. "REAL(4)|REAL(4)|"
};

class SymbolIndex {
  llvm::StringMap<llvm::SmallVector<CommonBlockEntry, 4>> commonBlockEntries;

public:
  void indexFile(llvm::StringRef path, Fortran::semantics::SemanticsContext &context);
  CommonBlockImpact analyzeCommonBlock(llvm::StringRef blockName) const;
  void dump() const;

  // Returns all tracked COMMON block names (for use by Reporter)
  std::vector<std::string> getAllBlockNames() const {
    std::vector<std::string> names;
    for (const auto &pair : commonBlockEntries) {
      names.push_back(pair.first().str());
    }
    return names;
  }
};

} // namespace modernizer
