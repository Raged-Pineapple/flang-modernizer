#include "ImpactAnalyzer/SymbolIndex.h"
#include "flang/Semantics/type.h"
#include <iostream>

namespace modernizer {

// Build a canonical type signature string for all objects in a COMMON block
// e.g. "REAL(4)|REAL(4)|" or "INTEGER(4)|INTEGER(4)|"
static std::string buildSignature(const Fortran::semantics::CommonBlockDetails &details) {
  std::string result;
  for (const auto &objRef : details.objects()) {
    const auto *sym = &objRef.get();
    if (const auto *type = sym->GetType()) {
      // In Flang 20, DeclTypeSpec::AsFortran() takes no args, returns std::string
      result += type->AsFortran() + "|";
    }
  }
  return result;
}

void SymbolIndex::indexFile(llvm::StringRef path, Fortran::semantics::SemanticsContext &context) {
  auto &globalScope = context.globalScope();

  auto traverse = [&](const Fortran::semantics::Scope &scope, auto &traverseRef) -> void {
    for (const auto &pair : scope.commonBlocks()) {
      const auto *symbol = &pair.second.get();
      if (const auto *details = symbol->detailsIf<Fortran::semantics::CommonBlockDetails>()) {
        std::string blockName = symbol->name().ToString();
        std::string sig = buildSignature(*details);

        auto &entries = commonBlockEntries[blockName];
        bool alreadySeen = false;
        for (const auto &e : entries) {
          if (e.filePath == path.str()) { alreadySeen = true; break; }
        }
        if (!alreadySeen) {
          entries.push_back({path.str(), sig});
        }
      }
    }
    for (const auto &child : scope.children()) {
      traverseRef(child, traverseRef);
    }
  };

  traverse(globalScope, traverse);
}

CommonBlockImpact SymbolIndex::analyzeCommonBlock(llvm::StringRef blockName) const {
  CommonBlockImpact impact;
  impact.blockName = blockName.str();

  auto it = commonBlockEntries.find(blockName);
  if (it == commonBlockEntries.end()) return impact;

  const auto &entries = it->second;
  impact.affectedFiles = entries.size();
  for (const auto &e : entries) {
    impact.files.push_back(e.filePath);
  }

  const std::string &refSig = entries[0].signature;
  for (const auto &e : entries) {
    if (e.signature != refSig) {
      impact.hasInconsistentDecls = true;
      break;
    }
  }
  return impact;
}

void SymbolIndex::dump() const {
  std::cout << "\n[Symbol Index Dump]\n";
  for (const auto &pair : commonBlockEntries) {
    std::cout << "COMMON /" << pair.first().str() << "/\n";
    const std::string &refSig = pair.second[0].signature;
    bool inconsistent = false;
    for (const auto &e : pair.second) {
      std::cout << "  - " << e.filePath << "  signature: [" << e.signature << "]\n";
      if (e.signature != refSig) inconsistent = true;
    }
    if (inconsistent) {
      std::cout << "  *** WARNING: Inconsistent declarations! Not safe to modernize automatically.\n";
    } else {
      std::cout << "  OK: Consistent across all " << pair.second.size() << " file(s). Safe to modernize.\n";
    }
  }
}

} // namespace modernizer
