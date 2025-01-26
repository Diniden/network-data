import { IEdge, INode } from "../types";

export interface INeighborsOptions<TNodeMeta, TEdgeMeta> {
  /** The node for which we want all of the neighboring nodes */
  node: INode<TNodeMeta, TEdgeMeta>;
  /** The set of nodes to exclude from the neighboring node list */
  exclude?: Set<INode<TNodeMeta, TEdgeMeta>>;
  /**
   * If set to true, this will include all the edges to excluded nodes in the
   * edge list.
   */
  includeEdgeToExcludedNode?: boolean;
  /**
   * If set to true, the result will include a list that shows the nodes
   * discovered as a neighbor but were found in the excluded list.
   */
  includeExcludedList?: boolean;
}

/**
 * This method gathers neighboring nodes of an input node. You can optionally
 * exclude nodes from the returned list.
 *
 * If includeEdgeToExcludedNode is set then when a node is examined that should
 * be excluded
 */
export function neighbors<TNodeMeta, TEdgeMeta>(
  options: INeighborsOptions<TNodeMeta, TEdgeMeta>
) {
  // Get options
  const { node, exclude, includeEdgeToExcludedNode, includeExcludedList } =
    options;

  const nodes: INode<TNodeMeta, TEdgeMeta>[] = [];
  const edges: IEdge<TNodeMeta, TEdgeMeta>[] = [];
  const excludedNodes: INode<TNodeMeta, TEdgeMeta>[] = [];
  const excludedEdges: IEdge<TNodeMeta, TEdgeMeta>[] = [];

  if (exclude) {
    // Gather incoming nodes
    for (let i = 0, iMax = node.in.length; i < iMax; ++i) {
      const edge = node.in[i];

      if (exclude.has(edge.in)) {
        if (includeExcludedList) {
          excludedNodes.push(edge.out);
          excludedEdges.push(edge);
        }
        if (includeEdgeToExcludedNode) edges.push(edge);
      } else if (includeEdgeToExcludedNode) {
        nodes.push(edge.in);
      }
    }

    // Gather outgoing nodes
    for (let i = 0, iMax = node.out.length; i < iMax; ++i) {
      const edge = node.out[i];

      if (exclude.has(edge.out)) {
        if (includeExcludedList) {
          excludedNodes.push(edge.out);
          excludedEdges.push(edge);
        }
        if (includeEdgeToExcludedNode) edges.push(edge);
      } else {
        nodes.push(edge.out);
        edges.push(edge);
      }
    }
  } else {
    // Gather incoming nodes
    for (let i = 0, iMax = node.in.length; i < iMax; ++i) {
      const edge = node.in[i];
      nodes.push(edge.in);
      edges.push(edge);
    }

    // Gather outgoing nodes
    for (let i = 0, iMax = node.out.length; i < iMax; ++i) {
      const edge = node.out[i];
      nodes.push(edge.out);
      edges.push(edge);
    }
  }

  return {
    nodes,
    edges,
    excludedNodes: includeExcludedList ? excludedNodes : undefined,
    excludedEdges: includeExcludedList ? excludedEdges : undefined,
  };
}
