import { IEdge, INetworkData, INode } from "../types";
import { makeList } from "../util/make-list";
import { addEdge } from "./add-edge";

/**
 * This contains the information to see which nodes were successfully added to the network as well as new edges
 */
export interface IAddNodeResult<TNodeMeta, TEdgeMeta> {
  /** Successfully added nodes */
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** Successfully added edges */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Nodes that had errors while adding */
  errors: Set<INode<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * Adds a node into a network. This ensures all edges and lookups are updated properly.
 */
export function addNode<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  nodes: INode<TNodeMeta, TEdgeMeta> | INode<TNodeMeta, TEdgeMeta>[],
  addedNodes?: Set<INode<TNodeMeta, TEdgeMeta>>,
  addedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>
): IAddNodeResult<TNodeMeta, TEdgeMeta> {
  // Ensure we're working with a list
  nodes = makeList(nodes);
  // Ensure we have a set to record newly added nodes
  addedNodes = addedNodes || new Set();
  // Create a set to track newly added edges
  addedEdges = addedEdges || new Set();
  // Create a set to track errors found during the adding process.
  const errors: Set<INode<TNodeMeta, TEdgeMeta>> = new Set();

  // Process all of the nodes to be added
  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];

    // If the node's id already exists, the node specified can not be re-added
    if (network.nodeMap.has(node.id)) {
      // If this was an edge added from processing added edges then this is not an error
      if (!addedNodes.has(node)) {
        errors.add(node);
      }

      continue;
    }

    // Add the node to the network
    network.nodes.push(node);
    network.nodeMap.set(node.id, node);
    addedNodes.add(node);
    // Examine the node's edges to establish all necessary links
    addEdge(network, node.out, addedEdges);
    addEdge(network, node.in, addedEdges);
  }

  return {
    nodes: addedNodes,
    edges: addedEdges,
    errors
  };
}
