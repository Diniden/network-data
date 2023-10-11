import { INetworkData, INode } from "../types";

/**
 * Options for performing the branchThresholdNode operation.
 *
 * NOTE: If min > max, the check becomes an exclusion check and the result will
 * contain the values that are NOT between min and max.
 */
export interface IBranchThresholdNodesOptions {
  /**
   * The minimum number of branches the node can have. Defaults to zero.
   */
  min?: number;
  /**
   * The maximum number of branches the node can have. Defaults to max integer.
   */
  max?: number;
}

/**
 * This selects groups of nodes where each node contains a number of branches.
 */
export async function branchThresholdNodes<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IBranchThresholdNodesOptions
): Promise<Set<INode<TNodeMeta, TEdgeMeta>>> {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  const nodes = network.nodes;
  // Loop through all of the nodes in the network to find all nodes that meet
  // the branch threshold criteria. They will be the start nodes of the spread
  // operation.
  const roots = new Set<INode<TNodeMeta, TEdgeMeta>>();
  let check = 0;

  if (min < max) {
    for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
      const node = nodes[i];
      check = node.in.length + node.out.length;
      if (check >= min && check <= max) roots.add(node);
    }
  }

  // If the min is greater than the max, we are doing an exclusion check and
  // the result will contain all nodes that are NOT between min and max.
  else {
    for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
      const node = nodes[i];
      check = node.in.length + node.out.length;
      if (check >= min || check <= max) roots.add(node);
    }
  }

  return roots;
}
