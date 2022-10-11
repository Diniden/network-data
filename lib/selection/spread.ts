import { IEdge, INode } from "../types";
import { makeList } from "../util/make-list";
import { neighbors } from "./neighbors";

/**
 * These are the options a result callback can respond with (the result callback is the result property injected in
 * the ISpreadOptions). This response can alter how the spread operation proceeds.
 */
export interface ISpreadResponseOptions {
  /** If this is set, this causes the spread operation to cease. */
  stop?: boolean;
}

/**
 * These are results that can be provided by the spread operation per each execution layer. The contents of results
 * will ALWAYS have nodes and edges, but other metrics may only be available depending on the options started in the
 * spread operation.
 */
export interface ISpreadResult<TNodeMeta, TEdgeMeta> {
  /** All found edges in this execution layer */
  edges: IEdge<TNodeMeta, TEdgeMeta>[];
  /** All found nodes in this execution layer */
  nodes: INode<TNodeMeta, TEdgeMeta>[];
  /**
   * If the spread options set the keepPath flag, then this is populated with a node's previously found item during the
   * spread. If you keep recursively searching for a parent, you will eventually get to the originating node. The
   * originating node will then have no parent and return undefined if searched for in this path.
   */
  path?: Map<
    INode<TNodeMeta, TEdgeMeta>,
    {
      source: INode<TNodeMeta, TEdgeMeta>;
      parent: INode<TNodeMeta, TEdgeMeta>;
    }[]
  >;
}

/**
 * This is the internal state used by a spread operation. It should be considered read-only, but is necessary to hand
 * off to other spread operations to facilitate layered spread behaviors.
 */
export interface ISpreadState<TNodeMeta, TEdgeMeta> {
  visitedNodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  visitedEdges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
}

/**
 * This describes how a spread operation prioritizes it's operations as it spreads out with other spread operations
 * taking place at the same time.
 */
export enum SpreadLayerPriority {
  /** Will execute on nodes that have been visited by other layers */
  BLENDS,
  /**
   * Will execute on nodes that have been visited by previous layers and prevent those layers from executing on any
   * node this has executed on.
   */
  OVERRIDES,
  /**
   * Will not execute on a visited node and stop spreading from that point.
   */
  TERMINATES,
  /**
   * Once a visited node is discovered, the entire spread operation quits.
   */
  COMPLETELY_TERMINATES,
  /**
   * When this hits a visited node of another spread operation, it will immediately cancel the spread operations
   * associated with that node.
   */
  TERMINATES_OTHERS
}

/**
 * These are the options you can inject for a spread operation
 */
export interface ISpreadOptions<TNodeMeta, TEdgeMeta> {
  /** Set this to remove edges that connect two nodes that have the same depth level from the source */
  excludeSameDepthEdges?: boolean;
  /**
   * If this is set to true, then an additional result will be created that will provide a path that returns to the
   * originating node.
   */
  keepPath?: boolean;
  /**
   * This controls how this spread operation should layer over existing spread operations
   */
  layering?: {
    /** This contains the layers the state */
    layers: ISpreadState<TNodeMeta, TEdgeMeta>[];
    /** Specifies how a spread operation will interact with existing spread operations */
    priority: SpreadLayerPriority;
    /**
     * When set to true, this causes this spread operation to wait for all other layer executions to complete a cycle
     * before this spread operation continues.
     */
    waitsForLayers?: boolean;
  };
  /**
   * When specified, this limits how deep into the network the spread will go from the input start nodes. Depth is an
   * integer where depth 0 is the start node and each subsequent neighbor node is 1 depth farther.
   */
  maxDepth?: number;
  /** When specified, this limits how many nodes can be aggregated at once while spreading out. */
  maxNodesPerExecution?: number;
  /**
   * This callback provides the results the spread operation discovers as it finds each new layer of nodes and edges.
   *
   * The next execution layer will NOT execute until a response is returned. This provides a means to control how quickly
   * the spread operation occurs.
   *
   * // Makes each spread operation execute after every frame
   * results: async (data) => {
   *   await onFrame();
   *   return {};
   * }
   *
   * When the results are provided, you have an opportunity to control several aspects of the spread operation in it's
   * current state, such as, cancel the operation, delay the next execution layer, and much more!
   */
  results(
    data: ISpreadResult<TNodeMeta, TEdgeMeta>
  ): Promise<ISpreadResponseOptions | null | undefined>;
  /** This is a list of all the nodes you wish to begin a spread operation from */
  startNodes: INode<TNodeMeta, TEdgeMeta> | INode<TNodeMeta, TEdgeMeta>[];
}

/**
 * This method is the foundation of almost all operations in the library. It's purpose is to take input nodes and gather
 * neighbors and then gather their neighbors and then gather their neighbors etc. This is grand for many normal network
 * data algorithms.
 *
 * However, this concept of spreading has MANY interesting ways to provide VERY interesting feedback!
 *
 * - Spread from multiple start points
 * - Determine if you're interested when the spreading starts hitting overlapped points
 * - Spread and keep a track record on how to get back to the start point(s)
 * - Retrieve edges while spreading
 * - Retrieve edges only going to points that have not been spread to
 * - Spread up to a certain depth
 * - Spread and determine overlap between spreading between multiple points
 *
 * Spreading also can have actions associated with it. Perhaps you want to run multiple spread operations and layer them
 * over each other! Perhaps you want to utilize some processing power!
 *
 * - Async or Sync spreading
 * - With multiple points: spread with multiple threads!
 * - Spread on an animation loop!
 * - Limit gather operations per frame!
 *
 * Spreading has many technical challenges as well as it needs to handle a potential 100k+ nodes and millions of edges.
 * As we spread we have to smartly keep tracking information down as much as possible.
 *
 * Perhaps you have a higher understanding of your network data. You may be able to aid the spread operation to spread
 * with a goal in mind. Perhaps you're searching for a node and your network is laid out in a way that you can optimize
 * which direction the spread operation should traverse. This spread operator will also provide a means to help it
 * along.
 *
 * So as can be seen: this is a POWERFUL method. It pins together most of our operations and facilitates many of the
 * algorithms posted here and it also helps with User Experience by breaking up the operation into manageable processing
 * chunks to prevent our RAM from overloading AND prevent our draw loop getting hung up for excessive periods of time.
 */
export function spread<TNodeMeta, TEdgeMeta>({
  startNodes,
  results: sendResults,
  excludeSameDepthEdges,
  keepPath
}: ISpreadOptions<TNodeMeta, TEdgeMeta>): ISpreadState<TNodeMeta, TEdgeMeta> {
  // The current state of this spread operation
  const state: ISpreadState<TNodeMeta, TEdgeMeta> = {
    visitedNodes: new Set(),
    visitedEdges: new Set()
  };

  // Make our initial processing queue containing all of our initial nodes from which we'll spread.
  let firstExec = true;
  let toProcess = makeList(startNodes).reverse();
  const edges: IEdge<TNodeMeta, TEdgeMeta>[] = [];
  const path = new Map();

  // Handles initial exec operations which includes things like first broadcast to include the starter nodes as the first
  // execution layer.
  const initExec = async () => {
    firstExec = false;

    // Broadcast the first results as the initial nodes injected
    const response = await sendResults({
      nodes: toProcess,
      edges: [],
      path: keepPath ? path : undefined
    });

    // Analyze the response for feedback on what to do next
    if (response) {
      // If the caller stops the execution, we need to free up memory right away and prevent calls exec
      if (response.stop) {
        state.visitedNodes.clear();
        state.visitedEdges.clear();
        return false;
      }
    }

    return true;
  };

  // This is the execution of each wave of the process. This is called each time the next layer of execution is to
  // be processed.
  const exec = async () => {
    const nextToProcess = [];

    // Handle initial exec pass
    if (firstExec) {
      const quit = await initExec();
      if (!quit) exec();
      return;
    }

    // Handle all nodes waiting to be processed
    while (toProcess.length > 0) {
      // Get the next node to be processed in the queue
      const node = toProcess.shift();
      // This is technically an error, but we will just continue and see what happens
      if (!node) continue;
      // If the node has been visited already, then we just move along
      if (state.visitedNodes.has(node)) continue;

      // Gather the neighbors of this node to add to our next execution layer
      const siblings = neighbors({
        node,
        exclude: state.visitedNodes,
        includeEdgeToExcludedNode: !excludeSameDepthEdges
      });

      // Add those neighbors into our next processing queue
      for (let i = 0, iMax = siblings.nodes.length; i < iMax; ++i) {
        const child = siblings.nodes[i];
        nextToProcess.push(child);
        state.visitedNodes.add(child);

        // If we need to track the path we took to reach this node, we store the processed node as the parent and
        // the neighbor node as the key reference to find the parent.
        if (keepPath) {
          path.set(child, node);
        }
      }

      for (let i = 0, iMax = siblings.edges.length; i < iMax; ++i) {
        const edge = siblings.edges[i];
        edges.push(edge);
      }
    }

    // Hand off the next discovered nodes to be processed next execution
    toProcess = nextToProcess;

    // Hand the results to the caller and wait for a response. Execution halts until the caller responds.
    const response = await sendResults({
      nodes: toProcess,
      edges,
      path: keepPath ? path : undefined
    });

    // Analyze the response for feedback on what to do next
    if (response) {
      // If the caller stops the execution, we need to free up memory right away and prevent calls exec
      if (response.stop) {
        state.visitedNodes.clear();
        state.visitedEdges.clear();

        // Exit here so that further exec operations do not take place
        return;
      }
    }

    // We can now fire up the next layer of execution if needed
    if (toProcess.length > 0) exec();
  };

  // Begin execution on first nodes
  exec();

  return state;
}
