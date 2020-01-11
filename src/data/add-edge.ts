import { IEdge, INetworkData } from "../types";
import { makeList } from "../util/make-list";
import { addToMapOfMaps } from "../util/map-of-maps";

/**
 * This contains the information to see which edges were successfully added to the network
 */
export interface IAddEdgeResult<TNodeMeta, TEdgeMeta> {
  /** Successfully added edges */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Edges that could not be added due to errors */
  errors: Set<IEdge<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * Adds an edge to the network and ensures it updates the associated nodes and lookups.
 *
 * Provide addedEdges to this method to prevent errors from being reported when multiple similar operations are
 * executed.
 */
export function addEdge<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  edges: IEdge<TNodeMeta, TEdgeMeta> | IEdge<TNodeMeta, TEdgeMeta>[],
  addedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>
): IAddEdgeResult<TNodeMeta, TEdgeMeta> {
  // Ensure we process a list
  edges = makeList(edges);
  // Tracks list of edges that were added in the operation
  addedEdges = addedEdges || new Set();
  // Tracks edges that had an error while trying to add it
  const errors: Set<IEdge<TNodeMeta, TEdgeMeta>> = new Set();

  // Process all edge adds that will happen
  for (let i = 0, iMax = edges.length; i < iMax; ++i) {
    const edge = edges[i];

    // We do not perform an add if the edge id is already a part of the network
    if (network.edgeMap.has(edge.id)) {
      // If this was an edge added from processing added edges then this is not an error
      if (!addedEdges.has(edge)) {
        errors.add(edge);
      }

      continue;
    }

    // Add the edge to the network
    network.edges.push(edge);
    // Add the lookup for the edge
    network.edgeMap.set(edge.id, edge);
    // Add the node lookup for the edge
    addToMapOfMaps(network.atobMap, edge.a, edge.b, edge);
    // Ensure the edge exists on the node
    let edgeIndex = edge.a.out.indexOf(edge);
    if (edgeIndex < 0) edge.a.out.push(edge);
    edgeIndex = edge.b.in.indexOf(edge);
    if (edgeIndex < 0) edge.b.in.push(edge);
    // Track the edge as being added successfully
    addedEdges.add(edge);
  }

  return {
    edges: addedEdges,
    errors: errors.size > 0 ? errors : null
  };
}
