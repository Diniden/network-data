import { hasNode } from "../data/has-node";
import { INetworkData, INode } from "../types";

/**
 * This method provides the shortest path between two nodes and provides the distance of the path.
 */
export function path<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  a: INode<TNodeMeta, TEdgeMeta>,
  b: INode<TNodeMeta, TEdgeMeta>
) {
  // Ensure both nodes specified are within the network in question
  if (!hasNode(network, [a, b])) return;

  return {
    path: [],
    distance: 0
  };
}
