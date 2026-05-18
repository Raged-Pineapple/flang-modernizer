#include "Reporter/ImpactReporter.h"
#include <algorithm>
#include <iostream>
#include <iomanip>

namespace modernizer {

static const char *riskStr(RiskLevel r) {
  switch (r) {
    case RiskLevel::SAFE:    return "SAFE   ";
    case RiskLevel::CAUTION: return "CAUTION";
    case RiskLevel::UNSAFE:  return "UNSAFE ";
  }
  return "UNKNOWN";
}

void ImpactReporter::addSyntacticFinding(const std::string &construct,
                                          const std::string &file,
                                          const std::string &description,
                                          int effortScore) {
  Finding f;
  f.construct     = construct;
  f.description   = description;
  f.risk          = RiskLevel::CAUTION;   // syntactic-only = can't verify safety
  f.effortScore   = effortScore;
  f.affectedFiles = 1;
  f.priorityScore = static_cast<int>(f.risk) * f.affectedFiles * f.effortScore;
  findings_.push_back(f);
}

void ImpactReporter::collectFromIndex(const SymbolIndex &index) {
  for (const auto &name : index.getAllBlockNames()) {
    CommonBlockImpact impact = index.analyzeCommonBlock(name);

    Finding f;
    f.construct     = "COMMON /" + name + "/";
    f.affectedFiles = static_cast<int>(impact.affectedFiles);

    if (impact.hasInconsistentDecls) {
      f.risk        = RiskLevel::UNSAFE;
      f.description = "Inconsistent declarations across " +
                      std::to_string(f.affectedFiles) +
                      " file(s) — type aliasing risk!";
      f.effortScore = 3; // hard: needs manual type reconciliation
    } else if (f.affectedFiles > 1) {
      f.risk        = RiskLevel::CAUTION;
      f.description = "Consistent across " + std::to_string(f.affectedFiles) +
                      " file(s) — safe to replace with MODULE variable.";
      f.effortScore = 2; // moderate: mechanical but affects many files
    } else {
      f.risk        = RiskLevel::SAFE;
      f.description = "Single-file COMMON block — straightforward to modernize.";
      f.effortScore = 1;
    }

    f.priorityScore = static_cast<int>(f.risk) * f.affectedFiles * f.effortScore;
    findings_.push_back(f);
  }
}

void ImpactReporter::printReport() const {
  if (findings_.empty()) {
    std::cout << "\n[Impact Report] No findings.\n";
    return;
  }

  // Sort by priority descending (highest priority = fix first)
  std::vector<Finding> sorted = findings_;
  std::sort(sorted.begin(), sorted.end(), [](const Finding &a, const Finding &b) {
    return a.priorityScore > b.priorityScore;
  });

  std::cout << "\n";
  std::cout << "========================================\n";
  std::cout << "  MODERNIZATION IMPACT REPORT\n";
  std::cout << "========================================\n";
  std::cout << std::left
            << std::setw(4)  << "#"
            << std::setw(10) << "RISK"
            << std::setw(7)  << "EFFORT"
            << std::setw(7)  << "FILES"
            << std::setw(8)  << "SCORE"
            << "CONSTRUCT\n";
  std::cout << "----------------------------------------\n";

  int rank = 1;
  for (const auto &f : sorted) {
    std::cout << std::left
              << std::setw(4)  << rank++
              << std::setw(10) << riskStr(f.risk)
              << std::setw(7)  << f.effortScore
              << std::setw(7)  << f.affectedFiles
              << std::setw(8)  << f.priorityScore
              << f.construct   << "\n";
    std::cout << "    -> " << f.description << "\n";
  }
  std::cout << "========================================\n";
  std::cout << "Total findings: " << sorted.size() << "\n";
}

} // namespace modernizer
