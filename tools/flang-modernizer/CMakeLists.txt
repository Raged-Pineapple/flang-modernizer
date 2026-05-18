add_executable(flang-modernizer main.cpp)

target_include_directories(flang-modernizer PRIVATE
  ${CMAKE_SOURCE_DIR}/include
  /usr/lib/llvm-20/include
)

target_link_libraries(flang-modernizer
  Checks
  ImpactAnalyzer
  Reporter
  FortranSemantics
  FortranEvaluate
  FortranParser
  FortranDecimal
  FortranCommon
  LLVMFrontendOpenMP
  LLVMFrontendOpenACC
  LLVMSupport
)
