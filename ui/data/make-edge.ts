import {
  Accessor,
  Identifier,
  IEdge,
  INetworkData,
  INode,
  isIdentifier,
  Weights,
} from "../types";
import { access, networkUID } from "../util";
import { getNode } from "./get-node";

/**
 * Generates an edge that connects two provided nodes. This is detached from the
 * concept of a network and can operate on detached data objects.
 *
 * Be sure to use addEdge to properly add the edge to the network
 * dataset. This does minor mutation to the nodes specified but does NOT
 * complete the networked data structure.
 */
export function makeEdge<TNodeMeta, TEdgeMeta>(
  id: Accessor<TEdgeMeta | void, Identifier, never>,
  nodeIn: INode<TNodeMeta, TEdgeMeta>,
  nodeOut: INode<TNodeMeta, TEdgeMeta>,
  inOutFlow: Weights = 0,
  outInFlow: Weights = 0,
  meta?: TEdgeMeta
): IEdge<TNodeMeta, TEdgeMeta> {
  const edge = {
    id: access(meta, id, isIdentifier) ?? networkUID(),
    in: nodeIn,
    out: nodeOut,
    inOutFlow,
    outInFlow,
    meta,
  };

  nodeIn.out.push(edge);
  nodeOut.in.push(edge);

  return edge;
}

/**
 * Generates an edge between two nodes within the provided network. Utilizes
 * identifiers to make the associations. If the nodes do not exist, then this
 * returns an undefined result.
 *
 * Be sure to use addEdge to properly add the edge to the network
 * dataset. This does minor mutation to the nodes specified but does NOT
 * complete the networked data structure.
 */
export function makeEdgeFromIds<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  id: Accessor<TEdgeMeta | void, Identifier, never>,
  nodeIn: Identifier,
  nodeOut: Identifier,
  inOutFlow: Weights = 0,
  outInFlow: Weights = 0,
  meta?: TEdgeMeta
): IEdge<TNodeMeta, TEdgeMeta> | void {
  const nodeIn_ = getNode(network, nodeIn);
  const nodeOut_ = getNode(network, nodeOut);

  if (nodeIn_ && nodeOut_) {
    return this.makeEdge(id, nodeIn_, nodeOut_, inOutFlow, outInFlow, meta);
  }
}
