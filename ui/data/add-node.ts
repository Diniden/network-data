import { IEdge, INetworkData, INode } from "../types";
import { makeList } from "../util/make-list";
import { addEdge } from "./add-edge";

/**
 * This contains the information to see which nodes were successfully added to
 * the network as well as new edges
 */
export interface IAddNodeResult<TNodeMeta, TEdgeMeta> {
  /** Successfully added nodes */
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** Successfully added edges */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Nodes that had errors while adding */
  nodeErrors: Set<INode<TNodeMeta, TEdgeMeta>> | null;
  /** Edges that had errors while adding */
  edgeErrors: Set<IEdge<TNodeMeta, TEdgeMeta>> | null;
}

/**
 * Adds a node into a network. This ensures all edges and lookups are updated
 * properly.
 *
 * Use the addedNodes and addedEdges Set to prevent errors from repeat
 * insertions from happening. The add methods use these lists internally to help
 * manage these issues and properly detect real errors.
 */
export function addNode<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  nodes: INode<TNodeMeta, TEdgeMeta> | INode<TNodeMeta, TEdgeMeta>[],
  addedNodes?: Set<INode<TNodeMeta, TEdgeMeta>>,
  addedEdges?: Set<IEdge<TNodeMeta, TEdgeMeta>>,
  preventEdgeCollisions?: boolean,
  ignoreEdges?: boolean
): IAddNodeResult<TNodeMeta, TEdgeMeta> {
  // Ensure we're working with a list
  nodes = makeList(nodes);
  // Quick look up for set of nodes being added for optimizing node additions as
  // a consequence of edges.
  const nodeSet = new Set(nodes);
  // Ensure we have a set to record newly added nodes
  addedNodes = addedNodes || new Set();
  // Create a set to track newly added edges
  addedEdges = addedEdges || new Set();
  // Create a set to track errors found during the adding process.
  const nodeErrors: Set<INode<TNodeMeta, TEdgeMeta>> = new Set();
  // List of edges that the injected nodes specified for adding to the network.
  const addEdges: IEdge<TNodeMeta, TEdgeMeta>[] = [];

  // Process all of the nodes to be added
  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];

    // If the node's id already exists, the node specified can not be re-added
    if (network.nodeMap.has(node.id)) {
      // If this was an edge added from processing added edges then this is not
      // an error
      if (!addedNodes.has(node)) nodeErrors.add(node);

      continue;
    }

    // Add the node to the network
    network.nodes.push(node);
    network.nodeMap.set(node.id, node);
    addedNodes.add(node);

    if (!ignoreEdges) {
      // We want to add all nodes first before we start to add edges. This helps
      // optimize our adding process by making edge ends available for lookup and
      // available for early exit.
      for (let k = 0, kMax = node.out.length; k < kMax; ++k) {
        const edge = node.out[k];
        const outNode = edge.out;
        addEdges.push(edge);

        // If the node is not in network and is not scheduled for adding, then we
        // should add it to the add schedule of this operation.
        if (!nodeSet.has(outNode) && !network.nodeMap.has(outNode.id)) {
          nodes.push(outNode);
          nodeSet.add(outNode);
          iMax++;
        }
      }

      for (let k = 0, kMax = node.in.length; k < kMax; ++k) {
        const edge = node.in[k];
        const inNode = edge.in;
        addEdges.push(edge);

        // If the node is not in network and is not scheduled for adding, then we
        // should add it to the add schedule of this operation.
        if (!nodeSet.has(inNode) && !network.nodeMap.has(inNode.id)) {
          nodes.push(inNode);
          nodeSet.add(inNode);
          iMax++;
        }
      }
    }
  }

  // Add in the edges discovered from all injected nodes. Our add operation
  // already added all of the adjacent nodes that were not specified by the
  // input node list. So simply add edges with no node adjustments.
  if (!ignoreEdges) {
    const { edgeErrors: edgeErrors } = addEdge(
      network,
      addEdges,
      addedNodes,
      addedEdges,
      preventEdgeCollisions,
      true
    );

    return {
      nodes: addedNodes,
      edges: addedEdges,
      nodeErrors: nodeErrors.size ? nodeErrors : null,
      edgeErrors,
    };
  }

  return {
    nodes: addedNodes,
    edges: addedEdges,
    nodeErrors: nodeErrors.size ? nodeErrors : null,
    edgeErrors: null,
  };
}
