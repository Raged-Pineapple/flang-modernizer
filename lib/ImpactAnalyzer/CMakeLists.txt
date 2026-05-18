add_library(ImpactAnalyzer STATIC 
  SymbolIndex.cpp
)
target_include_directories(ImpactAnalyzer PUBLIC
  ${CMAKE_SOURCE_DIR}/include
  /usr/lib/llvm-20/include
)
target_link_libraries(ImpactAnalyzer
  FortranSemantics
)
