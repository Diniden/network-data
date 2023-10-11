import { Identifier, IEdge, INetworkData, INode } from "../types";
import { getFromMapOfMaps } from "../util/map-of-maps";
import { getNode } from "./get-node";

/**
 * This checks the network to see if a connection exists between two nodes. If
 * one does not exist, then this returns null.
 */
export function getEdge<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  a: INode<TNodeMeta, TEdgeMeta>,
  b: INode<TNodeMeta, TEdgeMeta>
): IEdge<TNodeMeta, TEdgeMeta> | void {
  return getFromMapOfMaps(network.inToOutMap, a, b);
}

/**
 * Checks the network for an edge that connects the two provided nodes that have
 * the given identifiers.
 */
export function getEdgeFromIds<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  a: Identifier,
  b: Identifier
): IEdge<TNodeMeta, TEdgeMeta> | void {
  return getFromMapOfMaps(
    network.inToOutMap,
    getNode(network, a),
    getNode(network, b)
  );
}
