import { IEdge, INetworkData, INode } from "../types";
import { getFromMapOfMaps } from "../util/map-of-maps";

/**
 * This checks the network to see if a connection exists between two nodes. If one does not exist, then this returns
 * null.
 */
export function getEdge<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  a: INode<TNodeMeta, TEdgeMeta>,
  b: INode<TNodeMeta, TEdgeMeta>
): IEdge<TNodeMeta, TEdgeMeta> | null {
  return getFromMapOfMaps(network.inToOutMap, a, b);
}
