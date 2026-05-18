#pragma once
#include "ImpactAnalyzer/SymbolIndex.h"
#include <string>
#include <vector>

namespace modernizer {

enum class RiskLevel { SAFE = 1, CAUTION = 2, UNSAFE = 3 };

struct Finding {
  std::string construct;    // e.g. "COMMON /physdat/"
  std::string description;
  RiskLevel risk;
  int effortScore;          // 1=easy, 2=moderate, 3=hard
  int affectedFiles;
  int priorityScore;        // risk * affectedFiles * effort (higher = fix first)
};

class ImpactReporter {
public:
  // Add a syntactic finding (from Phase 1 checks)
  void addSyntacticFinding(const std::string &construct,
                           const std::string &file,
                           const std::string &description,
                           int effortScore);

  // Collect semantic findings from the SymbolIndex (Phase 2)
  void collectFromIndex(const SymbolIndex &index);

  // Print the final ranked impact report
  void printReport() const;

private:
  std::vector<Finding> findings_;
};

} // namespace modernizer
