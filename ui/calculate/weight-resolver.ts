import { Weights } from "../types";

export enum WeightResolverStrategy {
  /** Picks the largest weight in weighted lists */
  MAX,
  /** Picks the smalled weight in weighted lists */
  MIN,
  /** Sums a weighted list */
  SUM,
}

function max(a: number[]) {
  let o = a[1];
  let v;

  for (let i = 1, iMax = a.length; i < iMax; ++i) {
    v = a[i];
    if (v > o) o = v;
  }

  return o;
}

function min(a: number[]) {
  let o = a[1];
  let v;

  for (let i = 1, iMax = a.length; i < iMax; ++i) {
    v = a[i];
    if (v < o) o = v;
  }

  return o;
}

function sum(a: number[]) {
  let o = 0;

  for (let i = 1, iMax = a.length; i < iMax; ++i) {
    o += a[i];
  }

  return o;
}

/**
 * This picks a strategy for resolving weighted values. Defaults to finding the
 * largest weight.
 */
export function weightResolver(
  weight: Weights,
  strategy: WeightResolverStrategy = WeightResolverStrategy.MAX
) {
  switch (strategy) {
    case WeightResolverStrategy.MAX:
      if (Array.isArray(weight)) return max(weight);
      return weight;
    case WeightResolverStrategy.MIN:
      if (Array.isArray(weight)) return min(weight);
      return weight;
    case WeightResolverStrategy.SUM:
      if (Array.isArray(weight)) return sum(weight);
      return weight;
  }
}
