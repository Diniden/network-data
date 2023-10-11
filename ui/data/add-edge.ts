import { IEdge, INetworkData, INode } from "../types";
import { makeList } from "../util/make-list";
import { addToMapOfMaps, getFromMapOfMaps } from "../util/map-of-maps";
import { addNode } from "./add-node";

/**
 * This contains the information to see which edges were successfully added to
 * the network
 */
export interface IAddEdgeResult<TNodeMeta, TEdgeMeta> {
  /**
   * Added nodes where an edge connects to a node that was previously not in
   * network.
   */
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** Successfully added edges */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Edges that could not be added due to errors */
  edgeErrors: Set<IEdge<TNodeMeta, TEdgeMeta>> | null;
  /** Nodes that were discovered and could not be added due to errors */
  nodeErrors: Set<INode<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * Adds an edge to the network and ensures it updates the associated nodes and
 * lookups.
 *
 * Provide addedEdges to this method to prevent errors from being reported when
 * multiple similar operations are executed.
 *
 * If preventCollisions is false or excluded, then this will replace an edge
 * when found in the network. If not, then if there is a collision with an
 * existing edge, the edge will be placed into the errors set.
 */
export function addEdge<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  edges: IEdge<TNodeMeta, TEdgeMeta> | IEdge<TNodeMeta, TEdgeMeta>[],
  addedNodes?: Set<INode<TNodeMeta, TEdgeMeta>>,
  addedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>,
  preventCollisions?: boolean,
  ignoreNodes?: boolean
): IAddEdgeResult<TNodeMeta, TEdgeMeta> {
  // Ensure we process a list
  edges = makeList(edges);
  // Tracks list of nodes that were added in the operation
  addedNodes = addedNodes || new Set();
  // Tracks list of edges that were added in the operation
  addedEdges = addedEdges || new Set();
  // Tracks edges that had an error while trying to add it
  const edgeErrors = new Set<IEdge<TNodeMeta, TEdgeMeta>>();
  // These are the nodes found that were not in network already and thus will be
  // added as a result of being connected with this edge.
  const addNodes: INode<TNodeMeta, TEdgeMeta>[] = [];

  // Process all edge adds that will happen
  for (let i = 0, iMax = edges.length; i < iMax; ++i) {
    const edge = edges[i];

    // We do not perform an add if the edge id is already a part of the network
    if (network.edgeMap.has(edge.id)) {
      // If this was an edge added from processing added edges then this is not
      // an error
      if (!addedEdges.has(edge)) {
        edgeErrors.add(edge);
      }

      continue;
    }

    // See if there is already an edge between the two nodes. We can not add an
    // edge if one exists
    if (
      preventCollisions &&
      getFromMapOfMaps(network.inToOutMap, edge.in, edge.out)
    ) {
      // If this was an edge added from processing added edges then this is not
      // an error
      if (!addedEdges.has(edge)) {
        edgeErrors.add(edge);
      }

      continue;
    }

    // Add the edge to the network
    network.edges.push(edge);
    // Add the lookup for the edge
    network.edgeMap.set(edge.id, edge);
    // Add the node lookup for the edge
    addToMapOfMaps(network.inToOutMap, edge.in, edge.out, edge);
    // Track the edge as being added successfully
    addedEdges.add(edge);

    if (!ignoreNodes) {
      // Ensure the edge exists on the nodes it's associated with
      let edgeIndex = edge.in.out.indexOf(edge);
      if (edgeIndex < 0) edge.in.out.push(edge);
      edgeIndex = edge.out.in.indexOf(edge);
      if (edgeIndex < 0) edge.out.in.push(edge);

      // Ensure the end nodes are in the network
      if (!network.nodeMap.has(edge.in.id)) addNodes.push(edge.in);
      if (!network.nodeMap.has(edge.out.id)) addNodes.push(edge.out);
    }
  }

  // Perform the add nodes operation for discovered nodes that were not added to
  // the network.
  if (!ignoreNodes) {
    const { nodeErrors } = addNode(
      network,
      addNodes,
      addedNodes,
      addedEdges,
      true
    );

    return {
      nodes: addedNodes,
      edges: addedEdges,
      edgeErrors: edgeErrors.size ? edgeErrors : null,
      nodeErrors,
    };
  }

  return {
    nodes: addedNodes,
    edges: addedEdges,
    edgeErrors: edgeErrors.size ? edgeErrors : null,
    nodeErrors: null,
  };
}
