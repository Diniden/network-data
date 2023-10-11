import { INetworkData, INode } from "../types";
import { arrayIsSet } from "../util/array-is-set";
import { ISpreadResult, spread } from "./spread";
import { IGroupError, IGroupResults } from "./types";

type CollisionRootNode<TNodeMeta, TEdgeMeta> = {
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  depth: number;
};
type RootNode<TNodeMeta, TEdgeMeta> =
  | INode<TNodeMeta, TEdgeMeta>
  | CollisionRootNode<TNodeMeta, TEdgeMeta>;

/** Errors discovered during ripple groups operation */
export interface IRippleGroupsError<TNodeMeta, TEdgeMeta>
  extends IGroupError<TNodeMeta, TEdgeMeta> {
  type: "ripple-groups-node-not-processed";
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  message?: string;
}

/** Output result from the ripple groups operation */
export interface IRippleGroupsResult<TNodeMeta, TEdgeMeta>
  extends IGroupResults<TNodeMeta, TEdgeMeta> {
  /**
   * Lookup for the roots of a given group. The Set representing the root is the
   * set of nodes that caused the group. The roots with depth 0 is the group that
   * belongs to the input start nodes. A root with depth > 0 is a group
   * generated from collisions with other ripples.
   */
  roots: Map<INode<TNodeMeta, TEdgeMeta>[], RootNode<TNodeMeta, TEdgeMeta>>;

  errors?: IRippleGroupsError<TNodeMeta, TEdgeMeta>[];
}

/** Options for a ripple group operation */
export interface IRippleGroups<TNodeMeta, TEdgeMeta> {
  /**
   * Ripple start points. Multiple ripples can cause collision groups to show
   * up if they visit a node at the same depth. Collisions can also NOT happen
   * with multiple ripples if they collide on an edge instead of a node.
   */
  start: INode<TNodeMeta, TEdgeMeta>[];

  /**
   * Provides each ripple as it's discovered
   */
  onRipple?(group: INode<TNodeMeta, TEdgeMeta>[]): Promise<void>;

  /**
   * Provides each collision group as it's discovered.
   */
  onCollision(
    root: Set<INode<TNodeMeta, TEdgeMeta>>,
    group: INode<TNodeMeta, TEdgeMeta>
  ): Promise<void>;
}

/**
 * This selects groups of nodes based on ripples. You provide starting nodes
 * where ripples are made, then a spread is performed at each ripple center.
 * Each depth makes a ripple wave and collisions between waves are clustered
 * together at that depth.
 *
 * This will result in groups for each ripple ripple center and groups for
 * collisions per depth per ripple center.
 *
 * IE - Three start nodes (A, B, C) will start spreading creating 3 ripples.
 * Collisions happen as the following:
 * - A + B collide at depth 1, 3, 5
 * - A + C collide at 2, 4
 * - B + C collide at 1, 5
 * - A + B + C collide at 1, 4, 5
 *
 * Each of those collision patterns will form groups, thus the example will have
 * 13 groups returned for this operation.
 * - 3 groups for the ripple centers
 * - 3 groups for A + B collisions
 * - 2 groups for A + C collisions
 * - 2 groups for B + C collisions
 * - 3 groups for A + B + C collisions
 */
export async function rippleGroups<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IRippleGroups<TNodeMeta, TEdgeMeta>
) {
  const errors: IRippleGroupsError<TNodeMeta, TEdgeMeta>[] = [];
  // Get all of the nodes we are about to process. As we gather nodes into
  // networks, they will get removed from this set so we know which nodes are
  // remaining for examining for the current or other networks.
  const toProcess = new Set(network.nodes);
  const groups: INode<TNodeMeta, TEdgeMeta>[][] = [];
  const groupSets: Set<INode<TNodeMeta, TEdgeMeta>>[] = [];
  const sizeCheck = 0;
  options.start.forEach((n) => toProcess.delete(n));

  // Stores groups based on the root associated with the group. The root can be
  // a node (specified as a start node in the options) or it can be a collision
  // root where multiple entry nodes as a set are the root.
  const groupByRoot = new Map<
    RootNode<TNodeMeta, TEdgeMeta>,
    INode<TNodeMeta, TEdgeMeta>[]
  >();
  // These are all of the roots generated from collisions. A Set of nodes
  // representing which sources created the collision represents the root.
  const collisionRoots: CollisionRootNode<TNodeMeta, TEdgeMeta>[] = [];

  // Seeks out a root representing the input nodes. Creates a new root if one
  // does not exist yet.
  function getCollisionRoot(
    nodes: INode<TNodeMeta, TEdgeMeta>[],
    depth: number
  ) {
    const existing = collisionRoots.find(
      (r) => r.depth === depth && arrayIsSet(nodes, r.nodes)
    );
    if (existing) return existing;
    const root = new Set(nodes);
    collisionRoots.push({
      depth,
      nodes: root,
    });
    return root;
  }

  // Perform the ripple spread for each start node
  // Stores the spread operation as it's own force network
  const group: INode<TNodeMeta, TEdgeMeta>[] = [];
  const groupSet = new Set<INode<TNodeMeta, TEdgeMeta>>();
  groups.push(group);
  groupSets.push(groupSet);
  const nodeToRoot = new Map<
    INode<TNodeMeta, TEdgeMeta>,
    RootNode<TNodeMeta, TEdgeMeta>
  >();

  // Spread through the network and initialize each node relative to it's parent
  // such that the simulation will not have initialized collisions. This
  // strategy also tends to produce a more balanced layout.
  await spread({
    startNodes: options.start,
    keepPreviousPath: true,

    // Handle each wave of nodes discovered. Place each around the parent
    // discovered
    results: async (result: ISpreadResult<TNodeMeta, TEdgeMeta>) => {
      const {
        nodes,
        util: { getParent },
      } = result;

      for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
        const node = nodes[i];

        if (toProcess.has(node)) {
          toProcess.delete(node);
          network.push(node);
          networkSet.add(node);
        }
      }

      return { stop: false };
    },
  });

  return {
    groups,
    groupSets,
    errors: errors.length > 0 ? errors : void 0,
  };
}
