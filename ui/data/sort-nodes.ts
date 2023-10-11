import {
  WeightResolverStrategy,
  weightResolver,
} from "../calculate/weight-resolver";
import { INode } from "../types";

export enum SortNodesMode {
  /** Nodes with the least edges coming "in" are first in the list */
  LEAST_EDGES_IN_FIRST,
  /** Nodes with the most edges coming "in" are first in the list */
  MOST_EDGES_IN_FIRST,
  /** Nodes with the least edges going "out" are first in the list */
  LEAST_EDGES_OUT_FIRST,
  /** Nodes with the most edges going "out" are first in the list */
  MOST_EDGES_OUT_FIRST,
  /** Nodes with the least "total" edges are first in the list */
  LEAST_EDGES_TOTAL_FIRST,
  /** Nodes with the most "total" edges are first in the list */
  MOST_EDGES_TOTAL_FIRST,
  /** Nodes with the smallest weights are first. NOTE: Requires "weightMode" param */
  LEAST_WEIGHT_FIRST,
  /** Nodes with the largest weights are first. NOTE: Requires "weightMode" param */
  MOST_WEIGHT_FIRST,
}

/**
 * Sorts a list of nodes by some common modes.
 *
 * WARNING: This sorts the nodes in place and does not create a copy list.
 */
export function sortNodes<TNodeMeta, TEdgeMeta>(
  nodes: INode<TNodeMeta, TEdgeMeta>[],
  mode: SortNodesMode,
  weightMode: WeightResolverStrategy = WeightResolverStrategy.MAX
) {
  switch (mode) {
    case SortNodesMode.LEAST_EDGES_IN_FIRST:
      nodes.sort((a, b) => a.in.length - b.in.length);
      break;

    case SortNodesMode.MOST_EDGES_IN_FIRST:
      nodes.sort((a, b) => b.in.length - a.in.length);
      break;

    case SortNodesMode.LEAST_EDGES_OUT_FIRST:
      nodes.sort((a, b) => a.out.length - b.out.length);
      break;

    case SortNodesMode.MOST_EDGES_OUT_FIRST:
      nodes.sort((a, b) => b.out.length - a.out.length);
      break;

    case SortNodesMode.LEAST_EDGES_TOTAL_FIRST:
      nodes.sort(
        (a, b) => a.out.length + a.in.length - (b.out.length + b.in.length)
      );
      break;

    case SortNodesMode.MOST_EDGES_TOTAL_FIRST:
      nodes.sort(
        (a, b) => b.out.length + b.in.length - (a.out.length + a.in.length)
      );
      break;

    case SortNodesMode.LEAST_WEIGHT_FIRST:
      nodes.sort(
        (a, b) =>
          weightResolver(a.value, weightMode) -
          weightResolver(b.value, weightMode)
      );
      break;

    case SortNodesMode.MOST_WEIGHT_FIRST:
      nodes.sort(
        (a, b) =>
          weightResolver(b.value, weightMode) -
          weightResolver(a.value, weightMode)
      );
      break;
  }

  return nodes;
}
