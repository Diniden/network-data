import { INetworkData } from "../types";
import {
  gatherConnectedNodes,
  IDisjointGroupsResults,
} from "./gather-connected-nodes";

/**
 * This selects all of the groups of nodes that are not connected to any other
 * groups of nodes.
 *
 * Essentially identifies islands of nodes.
 */
export async function disjointGroups<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>
): Promise<IDisjointGroupsResults<TNodeMeta, TEdgeMeta>> {
  // The gather operation includes disjoint groupings as a side effect of it's
  // processing. So, we simply provide no roots and thus all results will be
  // injected into the disjoint results.
  const results = await gatherConnectedNodes(network, new Set());

  return results.disjoint;
}
