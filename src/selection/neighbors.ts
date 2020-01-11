import { INode } from "../types";

export interface INeighborsOptions<TNodeMeta, TEdgeMeta> {
  node: INode<TNodeMeta, TEdgeMeta>;
  exclude?: Set<INode<TNodeMeta, TEdgeMeta>>;
  includeEdgeToExcludedNode?: boolean;
}

/**
 * This method gathers neighboring nodes of an input node. You can optionally exclude nodes from the returned list.
 *
 * If includeEdgeToExcludedNode is set then when a node is examined that should be excluded
 */
export function neighbors<TNodeMeta, TEdgeMeta>({
  node,
  exclude,
  includeEdgeToExcludedNode
}: INeighborsOptions<TNodeMeta, TEdgeMeta>) {
  const nodes = [];
  const edges = [];

  if (exclude) {
    // Gather incoming nodes
    for (let i = 0, iMax = node.in.length; i < iMax; ++i) {
      const edge = node.in[i];

      if (!exclude.has(edge.a)) {
        nodes.push(edge.a);
        edges.push(edge);
      } else if (includeEdgeToExcludedNode) {
        edges.push(edge);
      }
    }

    // Gather outgoing nodes
    for (let i = 0, iMax = node.out.length; i < iMax; ++i) {
      const edge = node.out[i];

      if (!exclude.has(edge.b)) {
        nodes.push(edge.b);
        edges.push(edge);
      } else if (includeEdgeToExcludedNode) {
        edges.push(edge);
      }
    }
  } else {
    // Gather incoming nodes
    for (let i = 0, iMax = node.in.length; i < iMax; ++i) {
      const edge = node.in[i];
      nodes.push(edge.a);
      edges.push(edge);
    }

    // Gather outgoing nodes
    for (let i = 0, iMax = node.out.length; i < iMax; ++i) {
      const edge = node.out[i];
      nodes.push(edge.b);
      edges.push(edge);
    }
  }

  return {
    nodes,
    edges
  };
}
