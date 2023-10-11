import { Identifier, INetworkData, INode } from "../types";

/**
 * Retrieves a node from the network based on the provided identifier.
 */
export function getNode<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  id: Identifier
): INode<TNodeMeta, TEdgeMeta> | undefined {
  return network.nodeMap.get(id);
}
