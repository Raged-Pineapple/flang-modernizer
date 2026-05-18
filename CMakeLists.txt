cmake_minimum_required(VERSION 3.20)
project(flang-modernizer)

set(CMAKE_CXX_STANDARD 17)

find_package(LLVM REQUIRED CONFIG HINTS /usr/lib/llvm-20/lib/cmake/llvm)

add_definitions(${LLVM_DEFINITIONS} -DFLANG_LITTLE_ENDIAN=1)

include_directories(
  ${LLVM_INCLUDE_DIRS}
  /usr/lib/llvm-20/include
  ${CMAKE_SOURCE_DIR}/include
)

link_directories(/usr/lib/llvm-20/lib)

add_subdirectory(lib/Checks)
add_subdirectory(lib/ImpactAnalyzer)
add_subdirectory(lib/Reporter)
add_subdirectory(tools/flang-modernizer)
add_subdirectory(test)
