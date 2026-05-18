#pragma once
#include "llvm/ADT/DenseMap.h"

namespace modernizer {
template <typename T>
class UnionFind {
  llvm::DenseMap<T, T> parent;
  llvm::DenseMap<T, unsigned> rank;
public:
  T find(T x) {
    if (parent.find(x) == parent.end()) {
      parent[x] = x;
      rank[x] = 0;
    }
    if (parent[x] != x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  void unite(T a, T b) {
    T rootA = find(a);
    T rootB = find(b);
    if (rootA != rootB) {
      if (rank[rootA] < rank[rootB]) {
        parent[rootA] = rootB;
      } else if (rank[rootA] > rank[rootB]) {
        parent[rootB] = rootA;
      } else {
        parent[rootB] = rootA;
        rank[rootA]++;
      }
    }
  }
  bool sameSet(T a, T b) { return find(a) == find(b); }
};
} // namespace modernizer
