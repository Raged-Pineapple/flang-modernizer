#include "Checks/ArithIfCheck.h"
#include "Checks/ComputedGotoCheck.h"
#include "Checks/EquivalenceCheck.h"
#include "Checks/CommonBlockCheck.h"
#include "Checks/ImplicitTypingCheck.h"
#include "Checks/StmtFunctionCheck.h"
#include "Checks/FixedFormCheck.h"
#include "Checks/AssumedSizeCheck.h"
#include "Checks/EntryCheck.h"
#include "ImpactAnalyzer/SymbolIndex.h"
#include "flang/Parser/parsing.h"
#include "flang/Parser/provenance.h"
#include "flang/Common/Fortran-features.h"
#include "flang/Common/LangOptions.h"
#include "flang/Semantics/semantics.h"
#include "llvm/Support/raw_ostream.h"
#include <iostream>
#include <string>
#include <vector>

using namespace Fortran::parser;
using namespace Fortran::semantics;

int main(int argc, char **argv) {
  if (argc < 2) {
    std::cerr << "Usage: flang-modernizer <file1.f> [file2.f ...]\n";
    return 1;
  }

  std::vector<std::string> paths;
  for (int i = 1; i < argc; ++i) {
    paths.push_back(argv[i]);
  }

  modernizer::SymbolIndex symIndex;
  
  Fortran::common::IntrinsicTypeDefaultKinds defaultKinds;
  Fortran::common::LanguageFeatureControl features;
  Fortran::common::LangOptions langOpts;

  for (const auto &path : paths) {
    std::cout << "\n=== Analyzing " << path << " ===\n";
    
    AllSources allSources;
    AllCookedSources allCooked(allSources);
    Options options;

    bool isFixedForm = (path.rfind(".f") == path.size() - 2) ||
                       (path.rfind(".F") == path.size() - 2);
    options.isFixedForm = isFixedForm;
    options.features = features;

    Parsing parsing(allCooked);
    parsing.Prescan(path, options);
    parsing.Parse(llvm::errs());

    if (!parsing.messages().empty()) {
      parsing.messages().Emit(llvm::errs(), allCooked);
    }

    if (parsing.parseTree().has_value()) {
      // Remove const so Semantics can mutate/decorate the tree
      auto &tree = *parsing.parseTree();
      
      // Pass the required 4 arguments
      SemanticsContext context{defaultKinds, features, langOpts, allCooked};
      Semantics semantics{context, tree};
      semantics.Perform();
      
      if (context.AnyFatalError()) {
        std::cerr << "Semantics failed for " << path << " (likely missing includes/modules, skipping semantic indexing)\n";
      } else {
        symIndex.indexFile(path, context);
      }

      modernizer::ArithIfCheck{}.Walk(tree, allCooked);
      modernizer::ComputedGotoCheck{}.Walk(tree, allCooked);
      modernizer::EquivalenceCheck{}.Walk(tree, allCooked);
      modernizer::CommonBlockCheck{}.Walk(tree, allCooked);
      modernizer::ImplicitTypingCheck{}.Walk(tree, allCooked);
      modernizer::StmtFunctionCheck{}.Walk(tree, allCooked);
      modernizer::FixedFormCheck{isFixedForm}.Walk(tree, allCooked);
      modernizer::AssumedSizeCheck{}.Walk(tree, allCooked);
      modernizer::EntryCheck{}.Walk(tree, allCooked);
    } else {
      std::cerr << "Failed to parse " << path << "\n";
    }
  }

  std::cout << "\n[Impact Analyzer] Finished Semantic Indexing\n"; symIndex.dump();
  return 0;
}
