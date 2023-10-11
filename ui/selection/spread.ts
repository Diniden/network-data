import { IEdge, INode } from "../types";
import { makeList } from "../util/make-list";
import { neighbors } from "./neighbors";

/**
 * These are the options a result callback can respond with (the result callback
 * is the result property injected in the ISpreadOptions). This response can
 * alter how the spread operation proceeds.
 */
export interface ISpreadResponseOptions {
  /** If this is set, this causes the spread operation to cease. */
  stop?: boolean;
}

/**
 * Represents a collision between two growing wave fronts from multiple start
 * nodes.
 */
export type SpreadCollision<TNodeMeta, TEdgeMeta> = {
  /** The node that was found at the same time between two wave fronts */
  node: INode<TNodeMeta, TEdgeMeta>;
  /**
   * The parent of the node from the direction it was coming. A parent can be a
   * collision as well.
   */
  parent?: INode<TNodeMeta, TEdgeMeta> | SpreadCollision<TNodeMeta, TEdgeMeta>;
};

/**
 * These are results that can be provided by the spread operation per each
 * execution layer. The contents of results will ALWAYS have nodes and edges,
 * but other metrics may only be available depending on the options started in
 * the spread operation.
 */
export interface ISpreadResult<TNodeMeta, TEdgeMeta> {
  /** This is the depth of this spread result. */
  depth: number;
  /** All found edges in this execution layer */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** All found nodes in this execution layer */
  nodes: INode<TNodeMeta, TEdgeMeta>[];
  /**
   * This contains all of the nodes that are visited at the exact same moment if
   * multiple entry nodes are specified.
   */
  collisions?: Set<INode<TNodeMeta, TEdgeMeta>>;
  /**
   * If the spread options set the keepPath flag, then this is populated with a
   * node's previously found item during the spread. If you keep recursively
   * searching for a parent, you will eventually get to the originating node.
   * The originating node will then have no parent and return undefined if
   * searched for in this path.
   *
   * If only keepPreviousPath is true, then this contains ONLY the path to the
   * previous wave. In this case, if the result queried from this is undefined,
   * it means the current wave is the starting nodes for the spread operation.
   *
   * If an array of entries are specified, then that means a collision between
   * spread wave fronts met at that node at the same time. In this case, any of
   * the nodes used from that list can be utilized to reach a root. Either path
   * will be equidistant (in depth only) from any of the roots specified.
   */
  path?: Map<
    INode<TNodeMeta, TEdgeMeta>,
    INode<TNodeMeta, TEdgeMeta> | INode<TNodeMeta, TEdgeMeta>[]
  >;

  /**
   * This provides helper methods to aid in analyzing the results of the spread.
   */
  util: {
    /**
     * Retrieves the root node in the provided path for the node. Returns the
     * node if there is no path for that node
     */
    getRoot: typeof getRoot;

    /**
     * Gets the parent of a node using the provided path from the spread
     * operation. If there is no parent, returns undefined.
     */
    getParent: typeof getParent;
  };
}

/**
 * This is the internal state used by a spread operation. This can be
 * manipulated to guide the spread operation.
 *
 * One example would be if the processing of a wave sends the results and the
 * response to the results detects node paths that are unecessary. The response
 * can simply add the nodes to the visited set and the spread operation will
 * not process them for continuation.
 */
export interface ISpreadState<TNodeMeta, TEdgeMeta> {
  /** This tracks how many iterations/waves this spread operation has performed */
  readonly depth: number;
  /** All nodes that have been broadcast as a result */
  processedNodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** All nodes to be processed on the next wave */
  willProcessNodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /**
   * Nodes can be placed into this backlog to prevent processing of the nodes
   * in the current wave but will be processed the next wave. After the next
   * wave is processed, the nodes will be moved back into the willProcessNodes
   * based on the queue they are stored.
   */
  processBacklog: {
    /**
     * Nodes will be appended to the tail of the next process queue. ie - these
     * nodes will show up on next result set's willProcessNode end.
     */
    tail: Set<INode<TNodeMeta, TEdgeMeta>>;
    /** Nodes will be prepended to the next process queue */
    head: Set<INode<TNodeMeta, TEdgeMeta>>;
    /**
     * Any nodes in here will NOT be processed until manually insertted into a
     * queue that gets loaded into the process queue.
     */
    vault: Set<INode<TNodeMeta, TEdgeMeta>>;
  };
  /** All edges that have been broadcast as a result */
  processedEdges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
}

/**
 * Internal state changes for the spread operation not available to anything
 * outside of this implemntation.
 */
interface ISpreadStateInternal<TNodeMeta, TEdgeMeta>
  extends ISpreadState<TNodeMeta, TEdgeMeta> {
  /** This tracks how many iterations/waves this spread operation has performed */
  depth: number;
}

/**
 * These are the options you can inject for a spread operation
 */
export interface ISpreadOptions<TNodeMeta, TEdgeMeta> {
  /**
   * Set this to remove edges that connect two nodes that have the same depth
   * level from the source
   */
  excludeSameDepthEdges?: boolean;
  /**
   * If this is set to true, then an additional result will be created that will
   * provide a path that returns to the originating node.
   */
  keepPath?: boolean;
  /**
   * This is a subset of keepPath. If keepPath is true, then this has no effect.
   * Otherwise, if this is true, then this will store only one level deep of the
   * path which represents the wave of nodes that provided the current wave of
   * nodes, but no further.
   */
  keepPreviousPath?: boolean;
  /**
   * When specified, this limits how deep into the network the spread will go
   * from the input start nodes. Depth is an integer where depth 0 is the start
   * node and each subsequent neighbor node is 1 depth farther.
   */
  maxDepth?: number;
  /**
   * When specified, this limits how many nodes can be aggregated at once while
   * spreading out.
   */
  maxNodesPerExecution?: number;
  /**
   * This callback provides the results the spread operation discovers as it
   * finds each new layer of nodes and edges.
   *
   * The next execution layer will NOT execute until a response is returned.
   * This provides a means to control how quickly the spread operation occurs.
   *
   * ```
   * // Makes each spread operation execute after every frame
   * results: async (data) => {
   *   await onFrame(); return {};
   * }
   * ```
   *
   * When the results are provided, you have an opportunity to control several
   * aspects of the spread operation in it's current state, such as, cancel the
   * operation, delay the next execution layer, and much more!
   */
  results(
    data: ISpreadResult<TNodeMeta, TEdgeMeta>,
    state: ISpreadState<TNodeMeta, TEdgeMeta>
  ): Promise<ISpreadResponseOptions | null | undefined | void>;
  /** This is a list of all the nodes you wish to begin a spread operation from */
  startNodes:
    | INode<TNodeMeta, TEdgeMeta>
    | INode<TNodeMeta, TEdgeMeta>[]
    | Set<INode<TNodeMeta, TEdgeMeta>>;
}

/**
 * Simple helper that identifies the root of the path leading to a specified
 * node. If there is no path for the node, returns the node itself as the root
 * of itself.
 */
function getRoot<TNodeMeta, TEdgeMeta>(
  path: ISpreadResult<TNodeMeta, TEdgeMeta>["path"],
  node: INode<TNodeMeta, TEdgeMeta>,
  resolvePathSplit?: (
    /** The potential parents of a node */
    options: INode<TNodeMeta, TEdgeMeta>[],
    /** The node for whom we are retrieving the parent */
    from: INode<TNodeMeta, TEdgeMeta>
  ) => INode<TNodeMeta, TEdgeMeta>
): INode<TNodeMeta, TEdgeMeta> {
  if (!path) return node;
  let current = node;
  let safety = 0;

  while (path.has(current) && safety++ < 50000) {
    const next = path.get(current);
    if (!next) return node;

    // Handle path splits that arise from collisions
    if (Array.isArray(next)) {
      // If we have a resolver, let it pick the node to use
      // Otherwise, just pick any node as it will lead us to a root in the same
      // number of jumps.
      current = resolvePathSplit ? resolvePathSplit(next, current) : next[0];
    } else {
      current = next;
    }
  }

  return current;
}

/**
 * Util method for getting the parent of a node cleanly
 */
function getParent<TNodeMeta, TEdgeMeta>(
  path: ISpreadResult<TNodeMeta, TEdgeMeta>["path"],
  node: INode<TNodeMeta, TEdgeMeta>,
  resolvePathSplit?: (
    options: INode<TNodeMeta, TEdgeMeta>[]
  ) => INode<TNodeMeta, TEdgeMeta>
): INode<TNodeMeta, TEdgeMeta> | undefined {
  if (!path) return undefined;
  const parent = path.get(node);
  if (!parent) return undefined;

  if (Array.isArray(parent)) {
    return resolvePathSplit ? resolvePathSplit(parent) : parent[0];
  }

  return parent;
}

/**
 * This method is the foundation of almost all operations in the library. It's
 * purpose is to take input nodes and gather neighbors and then gather their
 * neighbors and then gather their neighbors etc. This is grand for many normal
 * network data algorithms.
 *
 * However, this concept of spreading has MANY interesting ways to provide VERY
 * interesting feedback!
 *
 * - Spread from multiple start points
 * - Determine if you're interested when the spreading starts hitting overlapped
 *   points
 * - Spread and keep a track record on how to get back to the start point(s)
 * - Retrieve edges while spreading
 * - Retrieve edges only going to points that have not been spread to
 * - Spread up to a certain depth
 * - Spread and determine overlap between spreading between multiple points
 *
 * Spreading also can have actions associated with it. Perhaps you want to run
 * multiple spread operations and layer them over each other! Perhaps you want
 * to utilize some processing power!
 *
 * - Async or Sync spreading
 * - With multiple points: spread with multiple threads!
 * - Spread on an animation loop!
 * - Limit gather operations per frame!
 *
 * Spreading has many technical challenges as well as it needs to handle a
 * potential 100k+ nodes and millions of edges. As we spread we have to smartly
 * keep tracking information down as much as possible.
 *
 * Perhaps you have a higher understanding of your network data. You may be able
 * to aid the spread operation to spread with a goal in mind. Perhaps you're
 * searching for a node and your network is laid out in a way that you can
 * optimize which direction the spread operation should traverse. This spread
 * operator will also provide a means to help it along.
 *
 * So as can be seen: this is a POWERFUL method. It pins together most of our
 * operations and facilitates many of the algorithms posted here and it also
 * helps with User Experience by breaking up the operation into manageable
 * processing chunks to prevent our RAM from overloading AND prevent our draw
 * loop getting hung up for excessive periods of time.
 */
export async function spread<TNodeMeta, TEdgeMeta>(
  options: ISpreadOptions<TNodeMeta, TEdgeMeta>
): Promise<ISpreadResult<TNodeMeta, TEdgeMeta>> {
  // Extract properties from options
  const {
    startNodes,
    results: sendResults,
    excludeSameDepthEdges,
    keepPath,
    keepPreviousPath,
    maxDepth = Number.MAX_SAFE_INTEGER,
  } = options;

  // Generic state for keeping the path for broadcasting to the results.
  const savePath = keepPath || keepPreviousPath;

  // The current state of this spread operation.
  // NOTE: We do NOT expressly set this type to ISpreadResult as the interface
  // has some readonly properties that we NEED to be writeable during the spread
  // operation.
  const state: ISpreadStateInternal<TNodeMeta, TEdgeMeta> = {
    depth: 0,
    processedNodes: new Set<INode<TNodeMeta, TEdgeMeta>>(),
    processedEdges: new Set<IEdge<TNodeMeta, TEdgeMeta>>(),
    willProcessNodes: new Set<INode<TNodeMeta, TEdgeMeta>>(),
    processBacklog: {
      tail: new Set<INode<TNodeMeta, TEdgeMeta>>(),
      head: new Set<INode<TNodeMeta, TEdgeMeta>>(),
      vault: new Set<INode<TNodeMeta, TEdgeMeta>>(),
    },
  };

  // Make a promise that resolves when this spread operation is complete
  let resolveSpread: (val: ISpreadResult<TNodeMeta, TEdgeMeta>) => void;
  let rejectSpread: (err: Error) => void;
  const completed = new Promise<ISpreadResult<TNodeMeta, TEdgeMeta>>(
    (r, rj) => ((resolveSpread = r), (rejectSpread = rj))
  );

  // Make our initial processing queue containing all of our initial nodes from
  // which we'll spread.
  let toProcess = makeList(startNodes);
  let firstExec = true;
  const edges = new Set<IEdge<TNodeMeta, TEdgeMeta>>();
  const path: ISpreadResult<TNodeMeta, TEdgeMeta>["path"] = new Map();

  // This performs a clean up of the state when the spread operation finishes
  const willStop = () => {
    // Do nothing for now. If there is some benefit to memory clearing here at
    // some point, we can add it in.
  };

  /**
   * Handles initial exec operations which includes things like first broadcast
   * to include the starter nodes as the first execution layer.
   *
   * Returns true if the pread operation should quit.
   */
  const initExec = async () => {
    firstExec = false;

    const results: ISpreadResult<TNodeMeta, TEdgeMeta> = {
      depth: 0,
      nodes: toProcess,
      edges: new Set(),
      path: savePath ? new Map() : void 0,
      util: { getRoot, getParent },
    };

    // Broadcast the first results as the initial nodes injected
    const response = await sendResults(results, state);
    state.depth++;

    if (state.depth >= maxDepth) {
      return results;
    }

    // Analyze the response for feedback on what to do next
    if (response) {
      // If the caller stops the execution, we need to free up memory right away
      // and prevent calls exec
      if (response.stop) {
        return results;
      }
    }

    return void 0;
  };

  // This is the execution of each wave of the process. This is called each time
  // the next layer of execution is to be processed.
  const exec = async () => {
    let run = true;

    try {
      // Handle initial exec pass
      if (firstExec) {
        const quit = await initExec();

        if (quit) {
          willStop();
          resolveSpread(quit);
          run = false;
        }
      }

      // Run the spread operation until the operation is complete.
      while (run) {
        const collisions = new Set<INode<TNodeMeta, TEdgeMeta>>();

        // Handle all nodes waiting to be processed
        while (toProcess.length > 0) {
          // Get the next node to be processed in the queue
          const node = toProcess.pop();
          // This is technically an error, but we will just continue and see what
          // happens
          if (!node) continue;
          // If the node has been processed already, then we just move along
          if (state.processedNodes.has(node)) continue;
          // Indicate this node is now officially processed
          state.processedNodes.add(node);

          // Gather the neighbors of this node to add to our next execution layer,
          // but exclude anything that's already been processed
          const siblings = neighbors({
            node,
            exclude: state.processedNodes,
            includeEdgeToExcludedNode: !excludeSameDepthEdges,
          });

          // Add those neighbors into our next processing queue
          for (let i = 0, iMax = siblings.nodes.length; i < iMax; ++i) {
            const child = siblings.nodes[i];
            const parents = path.get(child);

            // If this building wave has the same node already added, this is a
            // collision between two of the wave fronts.
            if (parents) {
              // If we have a list of parents, add the additional parent to the
              // list
              if (Array.isArray(parents)) parents.push(node);
              // If there is just a single parent found, convert it to a list
              // and add this parent to the list
              else path.set(child, [parents, node]);
              // Register the collision
              collisions.add(child);
            } else {
              // In order for collisions to work, we always store the path. This
              // will at the minimum keep the previous wave to current wave
              // parent information which is the bare minimum required for
              // collision detection. The process further down will handle
              // clearing the path if needed.
              path.set(child, node);
            }

            // Queue up the node to be processed next wave
            state.willProcessNodes.add(child);
          }

          // Add the edges to our list of edges, we "can" include edges between
          // same depth nodes on the wave. We definitely exclude edges that
          // backflow to a previous wave.
          for (let i = 0, iMax = siblings.edges.length; i < iMax; ++i) {
            const edge = siblings.edges[i];
            if (state.processedEdges.has(edge)) continue;
            state.processedEdges.add(edge);
            edges.add(edge);
          }
        }

        // Generate the results from processing this wave
        const results: ISpreadResult<TNodeMeta, TEdgeMeta> = {
          depth: state.depth,
          nodes: Array.from(state.willProcessNodes.values()),
          edges,
          path: savePath ? path : void 0,
          collisions: collisions.size > 0 ? collisions : void 0,
          util: { getRoot, getParent },
        };

        // See if we did process some nodes.
        if (state.willProcessNodes.size > 0) {
          // Hand the results to the caller and wait for a response. Execution halts
          // until the caller responds.
          const response = await sendResults(results, state);
          // Load up the next node wave after the response, so implementation has a
          // chance to modify it before prepping it on the queue
          toProcess = Array.from(state.willProcessNodes.values());

          // Analyze the response for feedback on what to do next
          if (response) {
            // If the caller stops the execution, we need to free up memory right away
            // and prevent calls exec
            if (response.stop) {
              // Clean up before we exit
              willStop();
              // Exit here so that further exec operations do not take place
              resolveSpread(results);
              run = false;
              break;
            }
          }
        }

        // No results left, no need to broadcast
        else toProcess = [];

        // Update state for next wave

        // Increment to the next depth level for next wave
        state.depth++;
        // For keeping one wave of path information, we clear the path each pass.
        // As each pass stores a single wave of path information.
        if (!keepPath) path.clear();
        // We have queued the nodes, this empties the queue so we can set up next
        // wave
        state.willProcessNodes.clear();
        // We clear our gathered edges so we can gather a new set of edges
        // represented by next wave.
        edges.clear();

        // See if we're done processing
        if (toProcess.length <= 0) {
          willStop();
          resolveSpread(results);
          run = false;
          return;
        }
      }
    } catch (err) {
      willStop();
      rejectSpread(err);
    }
  };

  // Begin execution and process the first wave
  exec();

  return await completed;
}
