#include "ImpactAnalyzer/SymbolIndex.h"
#include <iostream>

namespace modernizer {

void SymbolIndex::indexFile(llvm::StringRef path, Fortran::semantics::SemanticsContext &context) {
  auto &globalScope = context.globalScope();
  for (const auto &pair : globalScope) {
    const auto *symbol = &pair.second.get();
    if (symbol->detailsIf<Fortran::semantics::CommonBlockDetails>()) {
      std::string blockName = symbol->name().ToString();
      commonBlockFiles[blockName].push_back(path.str());
    }
  }
}

CommonBlockImpact SymbolIndex::analyzeCommonBlock(llvm::StringRef blockName) const {
  CommonBlockImpact impact;
  impact.blockName = blockName.str();
  auto it = commonBlockFiles.find(blockName);
  if (it != commonBlockFiles.end()) {
    impact.files = it->second;
    impact.affectedFiles = impact.files.size();
  }
  return impact;
}

void SymbolIndex::dump() const {
  std::cout << "\n[Symbol Index Dump]\n";
  for (const auto &pair : commonBlockFiles) {
    std::cout << "COMMON /" << pair.first().str() << "/ found in:\n";
    for (const auto &file : pair.second) {
      std::cout << "  - " << file << "\n";
    }
  }
}

} // namespace modernizer
