add_library(Checks STATIC
  PlaceholderCheck.cpp
  ArithIfCheck.cpp
  ComputedGotoCheck.cpp
  EquivalenceCheck.cpp
  CommonBlockCheck.cpp
  ImplicitTypingCheck.cpp
  StmtFunctionCheck.cpp
  FixedFormCheck.cpp
  AssumedSizeCheck.cpp
  EntryCheck.cpp
)
target_include_directories(Checks PUBLIC
  ${CMAKE_SOURCE_DIR}/include
  /usr/lib/llvm-20/include
)
target_link_libraries(Checks
  FortranParser
  FortranSemantics
  FortranSupport
)
