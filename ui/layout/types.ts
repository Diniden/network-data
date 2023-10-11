import { Identifier, INode } from "../types";

/**
 * This defines the positional information for laying out a single node in a
 * standard result.
 */
export interface ILayoutNode<TNodeMeta, TEdgeMeta> {
  /** x-coordinate of the node */
  x: number;
  /** y-coordinate of the node */
  y: number;
  /** Potential z-coordinate of the node if the layout uses a 3D strategy */
  z?: number;
  /** Radius the node should be rendered */
  r: number;
  /** The node this layout is associated with */
  d: INode<TNodeMeta, TEdgeMeta>;
}

/**
 * Common results from any layout operation
 */
export interface ILayoutResult<TNodeMeta, TEdgeMeta> {
  /** The node position information from the layout */
  nodes: ILayoutNode<TNodeMeta, TEdgeMeta>[];
  /** A lookup of the node positional information by node Identifier */
  nodeById: Map<
    Identifier | void,
    ILayoutResult<TNodeMeta, TEdgeMeta>["nodes"][number]
  >;
  /** Edges linking node position to node position */
  edges: {
    source: ILayoutResult<TNodeMeta, TEdgeMeta>["nodes"][number];
    target: ILayoutResult<TNodeMeta, TEdgeMeta>["nodes"][number];
  }[];
}

/**
 * Common options for any layout operation
 */
export interface ILayout<TNodeMeta, TEdgeMeta> {
  /**
   * Initial layout information to decalre all of the positions that will be in
   * play. May provide some sensical initial positions, but will not be too
   * useful quite yet.
   */
  onLayoutBegin?(result: ILayoutResult<TNodeMeta, TEdgeMeta>): Promise<void>;
  /**
   * This provides either a complete layout, or a partial layout, or a complete
   * but partially finished layout. This is called after each iteration of the
   * layout. The layout operation should return the final layout result and this
   * should provide an iterative layout result.
   */
  onLayoutUpdate?(result: ILayoutResult<TNodeMeta, TEdgeMeta>): Promise<void>;
}
