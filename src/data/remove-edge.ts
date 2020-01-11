import { IEdge, INetworkData } from "../types";
import { makeList } from "../util/make-list";
import { removeFromMapOfMaps } from "../util/map-of-maps";

/**
 * The results of the remove operation.
 */
export interface IRemoveEdgeResult<TNodeMeta, TEdgeMeta> {
  /** The edges successfully remvoed */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** The edges that could not be removed */
  errors: Set<IEdge<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * This removes an edge from it's network data structure.
 *
 * Specify removedEdges to prevent errors from being created across multiple edge removals.
 */
export function removeEdge<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  edges: IEdge<TNodeMeta, TEdgeMeta> | IEdge<TNodeMeta, TEdgeMeta>[],
  removedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>
) {
  // Ensure we are working with a list
  edges = makeList(edges);
  // Tracks edges we successfully removed
  removedEdges = removedEdges || new Set<IEdge<TNodeMeta, TEdgeMeta>>();
  // Tracks edges that could not be removed
  const errors = new Set<IEdge<TNodeMeta, TEdgeMeta>>();

  // Processes all edges to be removed
  for (let i = 0, iMax = edges.length; i < iMax; ++i) {
    // Get the next edge to process
    const edge = edges[i];

    // If the edge is not within the provided network, this is a no-op. This also cleans the edge out of the network.
    if (!network.edgeMap.delete(edge.id)) {
      // If we couldn't delete the edge because it wasn't in the network, we check to see if it was already removed
      if (!removedEdges.has(edge)) {
        // If it wasn't removed, this means this edge just didn't exist at all in this network, thus is an error
        errors.add(edge);
      }

      continue;
    }

    // Safely clean the edge out of it's associated nodes
    const aIndex = edge.a.out.indexOf(edge);
    const bIndex = edge.b.in.indexOf(edge);
    if (aIndex > -1) edge.a.out.splice(aIndex, 1);
    if (bIndex > -1) edge.b.in.splice(bIndex, 1);
    // Clean out the edge from the network's listing
    const edgeIndex = network.edges.indexOf(edge);
    if (edgeIndex > -1) network.edges.splice(edgeIndex, 1);
    // Clean out the atob mapping from the network
    removeFromMapOfMaps(network.atobMap, edge.a, edge.b);
  }

  return {
    edges: removedEdges,
    errors: errors.size > 0 ? errors : null
  };
}
