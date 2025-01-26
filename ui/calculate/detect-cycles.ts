import { ISpreadResult, spread } from "../selection";
import { INetworkData, INode } from "../types";

/**
 * This detects cycle structures in a network. This attempts to find smallest
 * cycles possible and will provide cycles that do not contain other cycles.
 *
 * NOTE: This EXPECTS a single network and WILL NOT WORK CORRECTLY on a network
 * with internal disjoint networks.
 */
export function detectCycles<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>
): INode<TNodeMeta, TEdgeMeta>[] {
  // We will track branches. A branch is a full path that extends in a
  // direction. At each node that forks to multiple paths, we will create a new
  // branch per path. Whenever an edge spans between branches that forms a
  // cycle. When a merge happens to a node, that forms a cycle per each merge
  // path.

  // When a cycle is found, the previous pathing that formed the cycle is no
  // longer valid for defining the next cycles. When an edge connects paths

  // Start spreading through the network from a single point.
  spread({
    // Begin at any node. We expect the provided network to be a single network
    // with no disjoint networks
    startNodes: [network.nodes[0]],
    // We keep the path to so we can analyze branches that connect which make
    // cycles.
    keepPath: true,

    results: async (data: ISpreadResult<TNodeMeta, TEdgeMeta>) => {
      if (!data.merges || !data.joins) {
        console.warn(`
          The spread operation for detect-cycles is somehow configured
          incorrectly and did not include joins and merges which is necessary
          for detecting cycles.
        `);
        return { stop: true };
      }

      const { merges, joins } = data;
    },
  });

  return [];
}
