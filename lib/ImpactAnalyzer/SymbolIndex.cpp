#include "ImpactAnalyzer/SymbolIndex.h"
#include <iostream>

namespace modernizer {

void SymbolIndex::indexFile(llvm::StringRef path, Fortran::semantics::SemanticsContext &context) {
  auto &globalScope = context.globalScope();
  
  // Lambda to recursively search all scopes for COMMON blocks
  auto traverse = [&](const Fortran::semantics::Scope &scope, auto &traverseRef) -> void {
    
    // In Flang, COMMON blocks are hidden in a completely separate map: scope.commonBlocks()
    for (const auto &pair : scope.commonBlocks()) {
      const auto *symbol = &pair.second.get();
      if (symbol->detailsIf<Fortran::semantics::CommonBlockDetails>()) {
        std::string blockName = symbol->name().ToString();
        
        // Prevent duplicate entries if a COMMON block appears multiple times in the same file
        auto &files = commonBlockFiles[blockName];
        if (files.empty() || files.back() != path.str()) {
          files.push_back(path.str());
        }
      }
    }
    
    // Traverse nested scopes (modules, subprograms, etc.)
    for (const auto &child : scope.children()) {
      traverseRef(child, traverseRef);
    }
  };
  
  traverse(globalScope, traverse);
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
