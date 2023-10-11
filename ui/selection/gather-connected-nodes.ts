import { INetworkData, INode } from "../types";
import { ISpreadResult, spread } from "./spread";
import { IGroupError, IGroupResults } from "./types";

/** Errors discovered during disjoint groups operation */
export interface IDisjointGroupsError<TNodeMeta, TEdgeMeta>
  extends IGroupError<TNodeMeta, TEdgeMeta> {
  type: "disjoint-groups-not-processed";
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  message?: string;
}

/**
 * Output results of the disjoint groups operation
 */
export interface IDisjointGroupsResults<TNodeMeta, TEdgeMeta>
  extends IGroupResults<TNodeMeta, TEdgeMeta> {
  /**
   * Discovered errors while processing
   */
  errors?: IDisjointGroupsError<TNodeMeta, TEdgeMeta>[];
}

/** Types of errors generated from a gatherConnectedNodes operation */
export enum IGatherConnectedNodesErrorType {
  NO_NETWORK,
  NOT_PROCESSED,
}

/** Errors generated during a gatherConnectedNodes operation */
export interface IGatherConnectedNodesError<TNodeMeta, TEdgeMeta>
  extends IGroupError<TNodeMeta, TEdgeMeta> {
  type: IGatherConnectedNodesErrorType;
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  message?: string;
}

/** The results from a gatherConnectedNodes operation */
export interface IGatherConnectedNodesResults<TNodeMeta, TEdgeMeta>
  extends IGroupResults<TNodeMeta, TEdgeMeta> {
  /**
   * All of the nodes that were used as the root for generating each group of
   * nodes.
   */
  roots: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** Discovered errors while processing */
  errors: IGatherConnectedNodesError<TNodeMeta, TEdgeMeta>[];
  /**
   * This contains all node groups that were not attached to any of the input
   * root nodes. These results will be empty all the time if the option
   * "includeDisjointed" is set to false.
   */
  disjoint: IDisjointGroupsResults<TNodeMeta, TEdgeMeta>;
}

/** Options for performing the gatherConnectedNodes operation */
export interface IGatherConnectedNodesOptions {
  /**
   * By default, the gather operation will include all nodes that are disjointed
   * and put the result into the disjoint property. If this is explicitly set to
   * false, the disjoint property will be empty, but it should be noted the
   * result will NOT contain the complete set of nodes from the input network
   * without the disjointed nodes.
   */
  includeDisjointed?: boolean;
}

/**
 * Gathers connected nodes in a network and groups them based on their connectivity and given root nodes.
 * This function also handles disjoint networks, nodes that don't belong to any of the root node networks.
 * Each group returned will contain no duplicate nodes, and nodes that overlap between groups will resolve
 * to one root's group or the other.
 *
 * @template TNodeMeta - The type of metadata for nodes in the network.
 * @template TEdgeMeta - The type of metadata for edges in the network.
 * @param {INetworkData<TNodeMeta, TEdgeMeta>} network - The network data containing nodes and edges.
 * @param {Set<INode<TNodeMeta, TEdgeMeta>>} rootNodes - A set of nodes that will act as roots for the connected node groups.
 * @param {IGatherConnectedNodesOptions} [options={}] - Optional settings for the function, such as whether to include disjointed networks (defaults to true).
 * @returns {Promise<IGatherConnectedNodesResults<TNodeMeta, TEdgeMeta>>} - A Promise that resolves with the results, including connected node groups, disjoint networks, and any errors encountered.
 *
 * @example
 * async function gatherAndDisplayConnectedNodes() {
 *   const networkData = { nodes: [...], edges: [...] };
 *   const rootNodeSet = new Set([node1, node2]);
 *
 *   const results = await gatherConnectedNodes(networkData, rootNodeSet);
 *   console.log('Connected node groups:', results.groups);
 *   console.log('Disjoint networks:', results.disjoint.groups);
 *   console.log('Errors:', results.errors);
 * }
 *
 * gatherAndDisplayConnectedNodes();
 */
export async function gatherConnectedNodes<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  rootNodes: Set<INode<TNodeMeta, TEdgeMeta>>,
  options: IGatherConnectedNodesOptions = {}
): Promise<IGatherConnectedNodesResults<TNodeMeta, TEdgeMeta>> {
  const { includeDisjointed } = options;

  const errors = [];
  const noNetworkError: IGatherConnectedNodesError<TNodeMeta, TEdgeMeta> = {
    type: IGatherConnectedNodesErrorType.NO_NETWORK,
    nodes: new Set(),
  };

  const nodes = network.nodes;
  // Keep a set of nodes that have been processed so we can ensure all nodes get
  // processed and placed into groups.
  const nodeSet = new Set(nodes);
  // Loop through all of the nodes in the network to find all nodes that meet
  // the branch threshold criteria. They will be the start nodes of the spread
  // operation.
  const roots = rootNodes;

  // We will track networks based on the parent node that picked.
  const networks = new Map<
    INode<TNodeMeta, TEdgeMeta>,
    [INode<TNodeMeta, TEdgeMeta>[], Set<INode<TNodeMeta, TEdgeMeta>>]
  >();

  // Make the group information for each node for each root. Also exclude the
  // root nodes from processing.
  roots.forEach((node) => {
    networks.set(node, [[node], new Set([node])]);
    nodeSet.delete(node);
  });

  // Perform the spread operation with the multiple start entry points. The
  // spread operation is a NOOP if there are no start nodes.
  if (roots.size > 0) {
    await spread({
      startNodes: roots,
      keepPreviousPath: true,

      results: async (data) => {
        const {
          nodes,
          path,
          util: { getParent },
        } = data;
        if (!path) return;

        for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
          const node = nodes[i];
          // Remove the node from the set of nodes to process. If the node is not
          // in the set then it has already been processed.
          if (!nodeSet.delete(node)) continue;

          // Get the parent of the node. We always select the first parent option
          // for consistent network assignment.
          const parent = getParent(path, node, (options) => options[0]);

          let selectedNetworkGroup:
            | [INode<TNodeMeta, TEdgeMeta>[], Set<INode<TNodeMeta, TEdgeMeta>>]
            | void;

          // A parent means this node is not a root node. We select the network
          // the parent selected.
          if (parent) {
            selectedNetworkGroup = networks.get(parent);
          }

          // Root nodes start registered
          else {
            selectedNetworkGroup = networks.get(node);
          }

          // No network discovered just means issues with the algorithm.
          if (!selectedNetworkGroup) {
            noNetworkError.nodes.add(node);
            continue;
          }

          // Add the node to the network
          const { 0: network, 1: networkSet } = selectedNetworkGroup;
          network.push(node);
          networkSet.add(node);

          // Propagate the network selection for the node
          networks.set(node, selectedNetworkGroup);

          // Check if the node added has ANY edges completely within the network
          // picked
          if (
            !node.in.find(
              (edge) => network.includes(edge.in) && network.includes(edge.out)
            ) &&
            !node.out.find(
              (edge) => network.includes(edge.in) && network.includes(edge.out)
            )
          ) {
            throw new Error("WRONG NETWORK PICKED");
          }
        }

        return;
      },
    });
  }

  if (noNetworkError.nodes.size > 0) {
    errors.push(noNetworkError);
  }

  let sizeCheck = 0;
  const disjointNetworks = new Map<
    INode<TNodeMeta, TEdgeMeta>,
    [INode<TNodeMeta, TEdgeMeta>[], Set<INode<TNodeMeta, TEdgeMeta>>]
  >();
  const disjoint: IDisjointGroupsResults<TNodeMeta, TEdgeMeta> = {
    groups: [],
    errors: [],
    groupSets: [],
  };

  // Must be an explicit opt out
  if (includeDisjointed !== false) {
    // After we have processed all nodes associated with networks that meet the
    // branch threshold criteria, we gather the remaining nodes into networks of
    // their own. This is essentially the disjoint network method at this point.
    while (nodeSet.size > 0 && sizeCheck !== nodeSet.size) {
      // Get an entry for a spread operation.
      const entry = nodeSet.values().next().value;
      // Get the new size of the process queue so we can compare it after a spread
      // operation. If the size does not change then this can infinite loop
      sizeCheck = nodeSet.size;
      // Stores the spread operation as it's own force network
      const network: INode<TNodeMeta, TEdgeMeta>[] = [];
      const networkSet = new Set<INode<TNodeMeta, TEdgeMeta>>();
      disjointNetworks.set(entry, [network, networkSet]);

      // Spread through the network and initialize each node relative to it's parent
      // such that the simulation will not have initialized collisions. This
      // strategy also tends to produce a more balanced layout.
      await spread({
        // We always only need to start at a single node to gather all nodes. If
        // we start at any other node other than a single node we risk causing a
        // flaw for cases that there is a single node in a network.
        startNodes: [entry],

        // Handle each wave of nodes discovered. Place each around the parent
        // discovered
        results: async (result: ISpreadResult<TNodeMeta, TEdgeMeta>) => {
          const { nodes } = result;

          for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
            const node = nodes[i];

            if (nodeSet.delete(node)) {
              network.push(node);
              networkSet.add(node);
            }
          }

          return { stop: false };
        },
      });
    }

    // Remaining nodes that were not processed are considered errors
    if (nodeSet.size > 0) {
      errors.push({
        type: IGatherConnectedNodesErrorType.NOT_PROCESSED,
        nodes: nodeSet,
      });
    }
  }

  // Convert the processed info into the expected result.
  const groups: INode<TNodeMeta, TEdgeMeta>[][] = [];
  const groupSets: Set<INode<TNodeMeta, TEdgeMeta>>[] = [];

  // We make many redundant value entries in our networks map. So we clean it up
  // by passing it to a set so we can make unique values for the output.
  new Set(networks.values()).forEach((entry, _i, _arr) => {
    groups.push(entry[0]);
    groupSets.push(entry[1]);
  });

  // Disjoint networks found do not have redundant network references when
  // attempting to find the network for a node. So we can simply loop all
  // networks present in the object.
  Array.from(disjointNetworks.values()).forEach((entry, _i, _arr) => {
    disjoint.groups.push(entry[0]);
    disjoint.groupSets.push(entry[1]);
  });

  return {
    roots,
    groups,
    groupSets,
    errors,
    disjoint,
  };
}
