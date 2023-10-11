import { packSiblings } from "d3-hierarchy";
import { INetworkData, INode } from "../types";
import { ILayout, ILayoutResult } from "./types";

/**
 * These are the options for initializing a ripple layout.
 */
export interface IRippleLayout<TNodeMeta, TEdgeMeta>
  extends ILayout<TNodeMeta, TEdgeMeta> {
  /**
   * The beginning nodes to perform the ripple layout on.
   */
  start: INode<TNodeMeta, TEdgeMeta>[];
  /** The size of the gap between ripples */
  ripplePadding?: number;

  /**
   * When the ripples are processed, disjoint networks might be discovered.
   * This gives an opportnity to resolve each disjoint network. Return some
   * start nodes to cause the ripple layout to be performed on the disjoint
   * network. Return ALL of the nodes if you just want them quick packed
   * together with no ripples. If you return no start nodes, this will default
   * to finding the highest value node (WeightResolverStrategy.MAX).
   */
  disjointResolver?(
    nodes: INode<TNodeMeta, TEdgeMeta>[]
  ): Promise<INode<TNodeMeta, TEdgeMeta>[]>;

  /**
   * Initialize response to the layout
   */
  onLayoutBegin?(result: ILayoutResult<TNodeMeta, TEdgeMeta>): Promise<void>;

  /**
   * Receive updates on the layout as it is discovered
   */
  onLayoutUpdate?(result: ILayoutResult<TNodeMeta, TEdgeMeta>): Promise<void>;

  /**
   * When a ripple is resolved, this provides an opportunity to sort that ripple
   * in a meaningful way before the ripple is packed. If this is not provided,
   * this will sort the nodes based on WeightResolverStrategy.MAX.
   */
  rippleSort?(
    wave: INode<TNodeMeta, TEdgeMeta>[]
  ): Promise<INode<TNodeMeta, TEdgeMeta>[]>;
}

/**
 * Applies a ripple layout to a network. Ripple layouts are EXTREMELY fast as
 * they only care about distance from the start nodes and collisions. This is
 * essentially a simple spread algorithm.
 *
 * Collisions will resolve to their own subnetworks and create a parent network
 * that illustrates those collisions.
 */
export function rippleLayout<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IRippleLayout<TNodeMeta, TEdgeMeta>
) {}
