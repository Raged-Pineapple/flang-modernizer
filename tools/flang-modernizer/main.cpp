#include "Checks/ArithIfCheck.h"
#include "Checks/AssumedSizeCheck.h"
#include "Checks/CommonBlockCheck.h"
#include "Checks/ComputedGotoCheck.h"
#include "Checks/EntryCheck.h"
#include "Checks/EquivalenceCheck.h"
#include "Checks/FixedFormCheck.h"
#include "Checks/ImplicitTypingCheck.h"
#include "Checks/StmtFunctionCheck.h"
#include "ImpactAnalyzer/SymbolIndex.h"
#include "Reporter/ImpactReporter.h"

#include "flang/Parser/parsing.h"
#include "flang/Semantics/semantics.h"
#include "flang/Semantics/expression.h"
#include "flang/Common/Fortran-features.h"
#include "flang/Common/default-kinds.h"
#include "flang/Common/LangOptions.h"
#include "llvm/Support/raw_ostream.h"

#include <iostream>
#include <string>
#include <vector>

int main(int argc, char *argv[]) {
  if (argc < 2) {
    std::cerr << "Usage: flang-modernizer <file1.f> [file2.f ...]\n";
    return 1;
  }

  std::vector<std::string> files;
  for (int i = 1; i < argc; ++i) {
    files.push_back(argv[i]);
  }

  modernizer::SymbolIndex symIndex;

  for (const auto &filePath : files) {
    std::cout << "\n=== Analyzing " << filePath << " ===\n";

    Fortran::parser::Options options;
    options.isFixedForm = filePath.size() >= 2 &&
                          filePath.substr(filePath.size() - 2) == ".f";

    Fortran::common::IntrinsicTypeDefaultKinds defaultKinds;
    Fortran::common::LanguageFeatureControl features;
    Fortran::common::LangOptions langOptions;
    Fortran::parser::AllSources allSources;
    Fortran::parser::AllCookedSources allCooked(allSources);
    Fortran::parser::Parsing parsing(allCooked);

    parsing.Prescan(filePath, options);
    if (!parsing.messages().empty()) {
      parsing.messages().Emit(llvm::errs(), allCooked);
    }
    parsing.Parse(llvm::outs());

    // Dereference the optional to get the Program& the checks expect
    auto &parseTree = *parsing.parseTree();

    // --- Phase 1: Syntactic checks (each has its own Walk(Program&, allCooked)) ---
    modernizer::ArithIfCheck arithCheck;
    arithCheck.Walk(parseTree, allCooked);

    modernizer::ComputedGotoCheck cgCheck;
    cgCheck.Walk(parseTree, allCooked);

    modernizer::EquivalenceCheck eqCheck;
    eqCheck.Walk(parseTree, allCooked);

    modernizer::CommonBlockCheck cbCheck;
    cbCheck.Walk(parseTree, allCooked);

    modernizer::ImplicitTypingCheck itCheck;
    itCheck.Walk(parseTree, allCooked);

    modernizer::StmtFunctionCheck sfCheck;
    sfCheck.Walk(parseTree, allCooked);

    modernizer::AssumedSizeCheck asCheck;
    asCheck.Walk(parseTree, allCooked);

    modernizer::EntryCheck entCheck;
    entCheck.Walk(parseTree, allCooked);

    modernizer::FixedFormCheck ffCheck(options.isFixedForm);
    ffCheck.Walk(parseTree, allCooked);

    // --- Phase 2: Semantic indexing ---
    Fortran::semantics::SemanticsContext semCtx(
        defaultKinds, features, langOptions, allCooked);
    Fortran::semantics::Semantics semantics(semCtx, parseTree);
    semantics.Perform();
    symIndex.indexFile(filePath, semCtx);
  }

  std::cout << "\n[Impact Analyzer] Finished Semantic Indexing\n";
  symIndex.dump();

  // --- Phase 3: Ranked impact report ---
  modernizer::ImpactReporter reporter;
  reporter.collectFromIndex(symIndex);
  reporter.printReport();

  return 0;
}
