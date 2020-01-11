import {
  Accessor,
  Identifier,
  IEdge,
  INetworkData,
  INode,
  isIdentifier,
  isWeights,
  Weights
} from "../types";
import { access } from "../util/access";
import { addToMapOfMaps } from "../util/map-of-maps";
import { removeEdge } from "./remove-edge";

/**
 * Options for generating network data from a flat list of data.
 */
export interface IMakeNetworkOptions<T, U, TNodeMeta, TEdgeMeta> {
  /** The accessor to retrieve the id of the node the edge originates from */
  edgeA: Accessor<U, Identifier>;
  /** The accessor to retrieve the id of the node the edge terminates at */
  edgeB: Accessor<U, Identifier>;
  /** The data that needs to be converted to edges */
  edgeData: U[];
  /** The accessor to retrieve the id of edges from the data */
  edgeId: Accessor<U, Identifier>;
  /** The accessor to retrieve all properties expected in the meta data of the edge */
  edgeMeta: Accessor<U, TEdgeMeta>;
  /** The accessor to retrieve the Weight values for an edge */
  edgeValues?: Accessor<U, { ab: Weights; ba: Weights }>;
  /** The data that needs to be converted to nodes */
  nodeData: T[];
  /** The accessor to retrieve the id of nodes from the data */
  nodeId: Accessor<T, Identifier>;
  /** The accessor to retrieve all properties expected in the meta data of the node */
  nodeMeta: Accessor<T, TNodeMeta>;
  /** The accessor to retrieve the Weight values for a node */
  nodeValues?: Accessor<T, Weights>;

  /**
   * Supply this with a list of errors you wish to ignore. For instance, in some cases, it may be necessary to have
   * node's with duplicate identifiers.
   */
  suppressErrors?: MakeNetworkErrorType[];
}

/**
 * These are the type of errors you will encounter while processing the data.
 */
export enum MakeNetworkErrorType {
  /** A lookup for a node happened, and there was no node found with the calculated identifier */
  NODE_NOT_FOUND,
  /** Two nodes were found with the same identifier. The most recent node will be the node preserved */
  DUPLICATE_NODE_ID,
  /** Two edges were found with the same identifier. The most recent edge will be the node preserved */
  DUPLICATE_EDGE_ID
}

/**
 * This is the structure for an error message from the system.
 */
export interface IMakeNetworkError<T, U> {
  /** The error type discovered */
  error: MakeNetworkErrorType;
  /** The data source items that were the culprits in causing the error */
  source: T | U | T[] | U[] | (T | U)[];
  /** A readable message to explain the cause of the error */
  message: string;
}

export interface IMakeNetworkResult<T, U, TNodeMeta, TEdgeMeta>
  extends INetworkData<TNodeMeta, TEdgeMeta> {
  /** All errors discovered while processing the data from old to new format */
  errors: IMakeNetworkError<T, U>[] | null;
}

/**
 * Handles generating and suppressing an error.
 */
function makeError<T, U>(
  suppress: Set<MakeNetworkErrorType>,
  errors: IMakeNetworkError<T, U>[],
  error: IMakeNetworkError<T, U>
) {
  if (suppress.has(error.error)) return;
  errors.push(error);
}

/**
 * This consumes a list of data and processes the objects to become INode's and IEdge's. The goal of this method is to
 * help the processor reduce it's memory footprint of a previous dataset as it grows the new networked dataset.
 *
 * This helps with processing enormous data loads and careful attention should be paid to how you are handling your data.
 * Ensure there are not multiple copies of the data in some way and let it be converted to this new format.
 */
export function makeNetwork<T, U, TNodeMeta, TEdgeMeta>(
  options: IMakeNetworkOptions<T, U, TNodeMeta, TEdgeMeta>
): IMakeNetworkResult<T, U, TNodeMeta, TEdgeMeta> {
  const {
    edgeA,
    edgeB,
    edgeData,
    edgeId,
    edgeMeta,
    edgeValues,
    nodeData,
    nodeId,
    nodeMeta,
    nodeValues,
    suppressErrors
  } = options;
  const nodes: INode<TNodeMeta, TEdgeMeta>[] = [];
  const edges: IEdge<TNodeMeta, TEdgeMeta>[] = [];
  const errors: IMakeNetworkError<T, U>[] = [];
  // This is a node UID that will be used if a UID cannot be determined from the accessor
  let nodeUID = 0;
  // This is an edge UID that will be used if a UID cannot be determined from the accessor
  let edgeUID = 0;
  // Create a lookup to retrieve a node by it's identifier
  const nodeMap = new Map<Identifier, INode<TNodeMeta, TEdgeMeta>>();
  // Create a lookup to retrieve an edge by it's identifier
  const edgeMap = new Map<Identifier, IEdge<TNodeMeta, TEdgeMeta>>();
  // Make a set from our list of errors to suppress
  const suppress = new Set(suppressErrors || []);
  // Create the lookup that stores our atob edge lookup
  const atobMap: INetworkData<TNodeMeta, TEdgeMeta>["atobMap"] = new Map();

  // This is the new network we're creating
  const network: IMakeNetworkResult<T, U, TNodeMeta, TEdgeMeta> = {
    nodes,
    edges,
    nodeMap,
    edgeMap,
    atobMap,
    errors: errors ? errors : null
  };

  // First map our data to node objects
  for (let i = 0, iMax = nodeData.length; i < iMax; ++i) {
    const data = nodeData[i];
    // We are working to free up as much memory as possible while processing. So provided the caller of this method
    // handled their data correctly, we should be cooking away all previous data objects in favor of becoming this
    // new data format, thus allowing the processor to free up any used RAM from the previous formats object allocation.
    delete nodeData[i];

    // Make our new node object format
    const node: INode<TNodeMeta, TEdgeMeta> = {
      id: access(data, nodeId, isIdentifier) || nodeUID++,
      in: [],
      out: [],
      value: access(data, nodeValues, isWeights) || [],
      meta:
        access(data, nodeMeta, (val: any): val is TNodeMeta => val) || undefined
    };

    // We must produce errors for duplicate node identifiers
    const previous = nodeMap.get(node.id);
    if (previous) {
      makeError(suppress, errors, {
        error: MakeNetworkErrorType.DUPLICATE_NODE_ID,
        source: [data, previous],
        message:
          "Two nodes have the same Identifier. This overrides the previous node discovered"
      });

      // Remove the previously found node
      nodes.splice(nodes.indexOf(previous), 1);
    }

    // Add the node to our list of generated nodes
    nodes.push(node);
    // Add a lookup for the node by it's identifier
    nodeMap.set(node.id, node);
  }

  // We now convert our edge data into real edges
  for (let i = 0, iMax = edgeData.length; i < iMax; ++i) {
    const data = edgeData[i];
    const a = access(data, edgeA, isIdentifier) || "";
    const b = access(data, edgeB, isIdentifier) || "";
    const nodeA = nodeMap.get(a);
    const nodeB = nodeMap.get(b);

    // Ensure both nodes can be found for the edge. If not, this is an invalid edge and will not be a part of the data.
    if (!nodeA || !nodeB) {
      makeError(suppress, errors, {
        error: MakeNetworkErrorType.NODE_NOT_FOUND,
        source: data,
        message:
          !a && !b
            ? "Could not find either node for this edge"
            : !a
              ? "Could not find node a for this edge"
              : !b
                ? "Could not find node b for this edge"
                : "Error"
      });

      continue;
    }

    // Retrieve the values this edge will have assigned to it
    const values = access(
      data,
      edgeValues,
      (val: any): val is { ab: Weights; ba: Weights } =>
        val && isWeights(val.ab) && isWeights(val.ba)
    ) || {
      ab: [],
      ba: []
    };

    // Create the new format edge type
    const edge: IEdge<TNodeMeta, TEdgeMeta> = {
      id: access(data, edgeId, isIdentifier) || edgeUID++,
      a: nodeA,
      b: nodeB,
      atob: values.ab,
      btoa: values.ba,
      meta:
        access(data, edgeMeta, (val: any): val is TEdgeMeta => val) || undefined
    };

    // We must produce errors for duplicate edge identifiers
    const previous = edgeMap.get(edge.id);
    if (previous) {
      makeError(suppress, errors, {
        error: MakeNetworkErrorType.DUPLICATE_EDGE_ID,
        source: [data, previous],
        message:
          "Two edges have the same Identifier. This overrides the previous edge discovered"
      });

      // Remove the previous edge from the network
      removeEdge(network, previous);
    }

    // Add the edge to the newly created edges
    edges.push(edge);
    // Add a lookup for the edge by it's identifier
    edgeMap.set(edge.id, edge);
    // Add the edge to it's nodes
    edge.a.out.push(edge);
    edge.b.in.push(edge);
    // Store the atob mapping this edge creates
    addToMapOfMaps(atobMap, edge.a, edge.b, edge);
  }

  return network;
}
