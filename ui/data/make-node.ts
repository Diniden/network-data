import {
  Accessor,
  Identifier,
  IEdge,
  INetworkData,
  INode,
  isDefined,
  isIdentifier,
  Weights,
} from "../types";
import { access, networkUID } from "../util";
import { makeList } from "../util/make-list";
import { getNode } from "./get-node";
import { makeEdge } from "./make-edge";

export type AddEdgeToNode<TNodeMeta, TEdgeMeta> = {
  /** The node to connect to */
  node: INode<TNodeMeta, TEdgeMeta>;
  /**
   * The edge information for the connection. The meta information must be a
   * match to the TEdgeMeta dynamic to guarantee stability within the data
   * across the network.
   */
  edge: Omit<Partial<IEdge<TNodeMeta, TEdgeMeta>>, "in" | "out"> & {
    meta: TEdgeMeta;
  };
};

export type AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta> = {
  /** The node id to connect to */
  id: Identifier;
  /**
   * The edge information for the connection. The meta information must be a
   * match to the TEdgeMeta dynamic to guarantee stability within the data
   * across the network.
   */
  edge: Omit<Partial<IEdge<TNodeMeta, TEdgeMeta>>, "in" | "out"> & {
    meta: TEdgeMeta;
  };
};

function fromAddEdge<TNodeMeta, TEdgeMeta>(node: INode<TNodeMeta, TEdgeMeta>) {
  return function (forward: boolean) {
    if (forward) {
      return function (addEdge: AddEdgeToNode<TNodeMeta, TEdgeMeta>) {
        const { node: edgeNode, edge } = addEdge;

        return makeEdge(
          () => edge.id || networkUID(),
          edgeNode,
          node,
          edge.inOutFlow,
          edge.outInFlow,
          edge.meta
        );
      };
    }

    return function (addEdge: AddEdgeToNode<TNodeMeta, TEdgeMeta>) {
      const { node: edgeNode, edge } = addEdge;

      return makeEdge(
        () => edge.id || networkUID(),
        node,
        edgeNode,
        edge.inOutFlow,
        edge.outInFlow,
        edge.meta
      );
    };
  };
}

/**
 * This generates a new node object and creates new edge associations based on
 * input nodes specified.
 *
 * This is detached from the concept of a network and can operate on detached
 * data objects. Be sure to use addNode to properly add the node to the network
 * dataset. This does minor mutation to the nodes specified but does NOT
 * complete the networked data structure.
 */
export function makeNode<TNodeMeta, TEdgeMeta>(
  id: Accessor<TNodeMeta | void, Identifier, never>,
  in_?:
    | AddEdgeToNode<TNodeMeta, TEdgeMeta>
    | AddEdgeToNode<TNodeMeta, TEdgeMeta>[],
  out_?:
    | AddEdgeToNode<TNodeMeta, TEdgeMeta>
    | AddEdgeToNode<TNodeMeta, TEdgeMeta>[],
  value?: Weights,
  meta?: TNodeMeta
): INode<TNodeMeta, TEdgeMeta> {
  const node: INode<TNodeMeta, TEdgeMeta> = {
    id: access(meta, id, isIdentifier) ?? networkUID(),
    in: [],
    out: [],
    value: value ?? 0,
    meta,
  };
  const toAddEdge = fromAddEdge<TNodeMeta, TEdgeMeta>(node);

  if (in_) node.in = makeList(in_).map(toAddEdge(true));
  if (out_) node.out = makeList(out_).map(toAddEdge(false));

  return node;
}

/**
 * Creates a mapping function that takes in Node ids and returns an
 * AddEdgeToNode from the identifier + edge combo
 */
function fromNodeId<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>
) {
  return function (
    addEdge: AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta>
  ): AddEdgeToNode<TNodeMeta, TEdgeMeta> | undefined {
    const node = getNode(network, addEdge.id);
    if (!node) return void 0;

    return {
      node,
      edge: addEdge.edge,
    };
  };
}

/**
 * Makes a new node object and forms edge associations by node identifiers
 * instead of node objects.
 *
 * This is detached from the concept of a network and can operate on detached
 * data objects. Be sure to use addNode to properly add the node to the network
 * dataset. This does minor mutation to the nodes specified but does NOT
 * complete the networked data structure.
 */
export function makeNodeFromIds<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  id: Accessor<TNodeMeta | void, Identifier, never>,
  in_?:
    | AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta>
    | AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta>[],
  out_?:
    | AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta>
    | AddEdgeFromIdToNode<TNodeMeta, TEdgeMeta>[],
  value?: Weights,
  meta?: TNodeMeta
): INode<TNodeMeta, TEdgeMeta> {
  const toAddEdge = fromNodeId(network);
  const inEdges = makeList(in_ || [])
    .map(toAddEdge)
    .filter(isDefined);
  const outEdges = makeList(out_ || [])
    .map(toAddEdge)
    .filter(isDefined);

  return makeNode(id, inEdges, outEdges, value, meta);
}
