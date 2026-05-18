add_library(Reporter STATIC
  PlaceholderReporter.cpp
  ImpactReporter.cpp
)

target_include_directories(Reporter PUBLIC
  ${CMAKE_SOURCE_DIR}/include
  /usr/lib/llvm-20/include
)

target_link_libraries(Reporter
  ImpactAnalyzer
  LLVMSupport
)
