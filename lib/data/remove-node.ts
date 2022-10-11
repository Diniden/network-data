import { IEdge, INetworkData, INode } from "../types";
import { makeList } from "../util/make-list";
import { removeEdge } from "./remove-edge";

/**
 * This contains the information to see which nodes were successfully removed from the network as well as edges
 */
export interface IRemoveNodeResult<TNodeMeta, TEdgeMeta> {
  /** List of nodes removed during the operation */
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** List of edges removed during the operation */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** List of nodes that could not be removed during the operation */
  errors: Set<INode<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * Removes a node from a network and cleans out the edges linking the node to other nodes.
 */
export function removeNode<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  nodes: INode<TNodeMeta, TEdgeMeta> | INode<TNodeMeta, TEdgeMeta>[],
  removedNodes?: Set<INode<TNodeMeta, TEdgeMeta>>,
  removedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>
) {
  // Ensure this is a list
  nodes = makeList(nodes);
  // Track all edges removed so we don't perform extra removals unnecessarily
  removedEdges = removedEdges || new Set();
  // Track all nodes successfully removed
  removedNodes = removedNodes || new Set();
  // Track all nodes that could not be removed during the operation
  const errors = new Set<INode<TNodeMeta, TEdgeMeta>>();

  // Loop through all nodes to remove
  for (let k = 0, kMax = nodes.length; k < kMax; ++k) {
    // Get the node to process
    const node = nodes[k];

    // Make sure the node is in the network dataset. If it is, make sure it's removed from the lookup.
    if (!network.nodeMap.delete(node.id)) {
      // If we couldn't delete the node because it wasn't in the network, we check to see if it was already removed
      if (!removedNodes.has(node)) {
        // If it wasn't removed, this means this node just didn't exist at all in this network, thus is an error
        errors.add(node);
      }

      continue;
    }

    // Clear out the outgoing edges from the node from the network
    const nodeOut = removeEdge(network, node.out, removedEdges);
    // Clear out the incoming edges to the node from the network
    const nodeIn = removeEdge(network, node.in, removedEdges);
    // Preserve the node's state. It gets modified from the removeEdge operation
    node.in = Array.from(nodeIn.edges).concat(Array.from(nodeIn.errors || []));
    node.out = Array.from(nodeOut.edges).concat(
      Array.from(nodeOut.errors || [])
    );
    // Clear out the node from the network
    network.nodes.splice(network.nodes.indexOf(node), 1);
    // Flag the node as removed
    removedNodes.add(node);
  }

  return {
    nodes: removedNodes,
    edges: removedEdges,
    errors: errors.size > 0 ? errors : null
  };
}
