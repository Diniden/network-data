import { INode } from "../types";

/**
 * Produces a list of nodes and edges shared between the input nodes.
 *
 * The depth provided indicates maximum node jumps the node can be to be considered shared.
 */
export async function sharedConnection<TNodeMeta, TEdgeMeta>(
  nodes: INode<TNodeMeta, TEdgeMeta>
) {}
