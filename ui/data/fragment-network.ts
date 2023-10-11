import assert from "assert";
import { IEdge, INetworkData, INode, IParentNetworkData } from "../types";
import { addToMapOfMaps, getFromMapOfMaps, networkUID } from "../util";
import { cloneEdge } from "./clone-edge";
import { cloneNode } from "./clone-node";
import { makeNetwork } from "./make-network";

/**
 * Types of errors associated with nodes that can happen during a
 * fragmentNetwork operation.
 */
export enum FragmentNetworkNodeErrorType {
  OTHER,
  NOT_PROCESSED,
}

/** Error description for this operation */
type FragmentNetworkError<TNodeMeta, TEdgeMeta> = {
  /** The error type describing why the error occurred */
  type: FragmentNetworkNodeErrorType;
  /** Nodes involved in the error */
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  /** Edges involved in the error */
  edges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Additional context if any */
  message?: string;
};

/** Output from the fragmentNetwork operation */
export interface IFragmentNetworkResult<TNodeMeta, TEdgeMeta> {
  /**
   * These are all of the sub networks discovered from the fragment operation
   */
  fragments: INetworkData<TNodeMeta, TEdgeMeta>[];
  /**
   * This is a network representing a network of all the fragments. This shows
   * how each fragment is connected to each other but does not retain details on
   * the nodes that used to be connected.
   */
  fragmentsNetwork: IParentNetworkData<TNodeMeta, TEdgeMeta>;
  /**
   * This contains all of the edges clipped from breaking apart the fragments.
   * These may still be useful if the representation of the edges is still
   * required.
   *
   * NOTE: These will be the original edge objects and NOT clones.
   */
  culledEdges: Set<IEdge<TNodeMeta, TEdgeMeta>>;
  /** Stores errored information */
  errors: FragmentNetworkError<TNodeMeta, TEdgeMeta>[];
}

/**
 * This takes a list of clusters of nodes and produces a network from each
 * cluster. All of the nodes can be from the same network. This will produce a
 * network from each cluster, will break apart any edges that span the clusters
 * but will produce a new network representing how the clusters are connected.
 *
 * The resulting broken apart networks will break any edges between each
 * cluster and instead provide a network object that represents all of the
 * clusters connected to each other.
 *
 * This is used to make the network easier to digest for various operations.
 *
 * WARNING: This operation clones network objects (not meta data). Thus this
 * will NOT mutate the input network BUT it can become very RAM intensive.
 */
export async function fragmentNetwork<TNodeMeta, TEdgeMeta>(
  networks: INode<TNodeMeta, TEdgeMeta>[][],
  networkSets: Set<INode<TNodeMeta, TEdgeMeta>>[]
): Promise<IFragmentNetworkResult<TNodeMeta, TEdgeMeta>> {
  // Gathered errors from the operation.
  const errors: FragmentNetworkError<TNodeMeta, TEdgeMeta>[] = [];

  // Set up looks up to easily create the fragment network
  const betweenNetworks: Map<
    number,
    Map<number, IEdge<TNodeMeta, TEdgeMeta>[]>
  > = new Map();
  const edgeError: FragmentNetworkError<TNodeMeta, TEdgeMeta> = {
    type: FragmentNetworkNodeErrorType.NOT_PROCESSED,
    nodes: new Set(),
    edges: new Set(),
  };

  const culledEdges: Set<IEdge<TNodeMeta, TEdgeMeta>> = new Set();

  // With all of the gathered disjoint subnetworks, we convert each into a
  // network data object.
  const fragments = networks.map((network, networkIndex) => {
    const networkSet = networkSets[networkIndex];
    const out: INetworkData<TNodeMeta, TEdgeMeta> = {
      edges: [],
      nodes: [],
      edgeMap: new Map(),
      nodeMap: new Map(),
      inToOutMap: new Map(),
    };

    // Loop through each network node and cull out edges that no longer exist.
    for (let i = 0, iMax = network.length; i < iMax; ++i) {
      const node = cloneNode(network[i]);
      if (out.nodeMap.has(node.id)) continue;
      out.nodeMap.set(node.id, node);
      out.nodes.push(node);

      // We must recreate the node's edges to remove any edges that extend to an
      // external network.
      const inEdges = node.in;
      node.in = [];

      for (let j = 0, jMax = inEdges.length; j < jMax; ++j) {
        let edge = inEdges[j];
        const hasIn = networkSet.has(edge.in);
        const hasOut = networkSet.has(edge.out);

        if (!hasIn || !hasOut) {
          culledEdges.add(edge);
        }

        // If both ends of the edge are in the network, then we can keep it.
        if (hasIn && hasOut) {
          const mappedEdge = out.edgeMap.get(edge.id);

          if (mappedEdge) {
            node.in.push(mappedEdge);
          } else {
            edge = cloneEdge(edge);
            out.edges.push(edge);
            out.edgeMap.set(edge.id, edge);
            node.in.push(edge);
          }
        }

        // Otherwise, the edge is between two networks
        else if (hasIn) {
          const inIndex = networkIndex;
          const outIndex = networkSets.findIndex((s) => s.has(edge.out));

          if (outIndex > -1) {
            const list = getFromMapOfMaps(
              betweenNetworks,
              inIndex,
              outIndex,
              []
            )!;
            list.push(edge);
          }
        } else if (hasOut) {
          const inIndex = networkSets.findIndex((s) => s.has(edge.in));
          const outIndex = networkIndex;

          if (inIndex > -1) {
            const list = getFromMapOfMaps(
              betweenNetworks,
              inIndex,
              outIndex,
              []
            )!;
            list.push(edge);
          }
        }

        // Somehow the edge does not exist in any current network. This is an
        // error.
        else {
          edgeError.edges.add(edge);
        }
      }

      const outEdges = node.out;
      node.out = [];

      for (let j = 0, jMax = outEdges.length; j < jMax; ++j) {
        let edge = outEdges[j];
        const hasIn = networkSet.has(edge.in);
        const hasOut = networkSet.has(edge.out);

        if (!hasIn || !hasOut) {
          culledEdges.add(edge);
        }

        if (hasIn && hasOut) {
          const mappedEdge = out.edgeMap.get(edge.id);

          if (mappedEdge) {
            node.in.push(mappedEdge);
          } else {
            edge = cloneEdge(edge);
            out.edges.push(edge);
            out.edgeMap.set(edge.id, edge);
            node.out.push(edge);
          }
        }

        // Otherwise, the edge is between two networks
        else if (hasIn) {
          const inIndex = networkIndex;
          const outIndex = networkSets.findIndex((s) => s.has(edge.out));

          if (outIndex > -1) {
            const list = getFromMapOfMaps(
              betweenNetworks,
              inIndex,
              outIndex,
              []
            )!;
            list.push(edge);
          }
        } else if (hasOut) {
          const inIndex = networkSets.findIndex((s) => s.has(edge.in));
          const outIndex = networkIndex;

          if (inIndex > -1) {
            const list = getFromMapOfMaps(
              betweenNetworks,
              inIndex,
              outIndex,
              []
            )!;
            list.push(edge);
          }
        }

        // Somehow the edge does not exist in any current network. This is an
        // error.
        else {
          edgeError.edges.add(edge);
        }
      }
    }

    // After the process is done, the edges will point to nodes that are not the
    // newly created deep cloned nodes. So we update them to point to the
    // correct node
    for (let i = 0, iMax = out.edges.length; i < iMax; ++i) {
      const edge = out.edges[i];
      edge.in = out.nodeMap.get(edge.in.id)!;
      edge.out = out.nodeMap.get(edge.out.id)!;
      addToMapOfMaps(out.inToOutMap, edge.in, edge.out, edge);
    }

    // Ensure every node in and out list points to the correct object references
    for (let i = 0, iMax = out.nodes.length; i < iMax; ++i) {
      const node = out.nodes[i];

      for (let k = 0, kMax = node.in.length; k < kMax; ++k) {
        node.in[k] = out.edgeMap.get(node.in[k].id)!;
      }

      for (let k = 0, kMax = node.out.length; k < kMax; ++k) {
        node.out[k] = out.edgeMap.get(node.out[k].id)!;
      }
    }

    return out;
  });

  // Log the edge error if any edges were not processed.
  if (edgeError.edges.size > 0) errors.push(edgeError);
  // Make a simple incrementor for the fragment ids
  let id = -1;

  // Make a generator to convert the special look up we created for in between
  // edges
  function* genEdge() {
    for (const [inIndex, outMap] of betweenNetworks.entries()) {
      for (const [outIndex, edges] of outMap) {
        yield [inIndex, outIndex, edges] as [
          number,
          number,
          IEdge<TNodeMeta, TEdgeMeta>[]
        ];
      }
    }
  }

  // We need to improve our ID uniqueness by mapping our indices to UIDs
  const indexToUID = new Map<number, number>();

  for (let i = 0, iMax = fragments.length; i < iMax; ++i) {
    indexToUID.set(i, networkUID());
  }

  // Build a new network data object representing all of the fragments
  // connected to each other.
  const fragmentsNetwork = await makeNetwork({
    nodeData: fragments,
    nodeId: () => indexToUID.get(++id) ?? 0,
    nodeMeta: (node) => node,
    edgeData: genEdge,
    edgeId: (e) => `${e[0]}-${e[1]}`,
    edgeIn: (e) => indexToUID.get(e[0]),
    edgeOut: (e) => indexToUID.get(e[1]),
    edgeMeta: (e) => e[2],
  });

  // Lets brush up the network IDs to be more robust and unique
  for (let i = 0, iMax = fragmentsNetwork.nodes.length; i < iMax; ++i) {
    const node = fragmentsNetwork.nodes[i];
    node.id = networkUID();
  }

  return {
    fragments,
    fragmentsNetwork,
    culledEdges,
    errors,
  };
}

/**
 * Runs some checks on fragmentation results to ensure they make sense.
 */
export function validateFragmentResults<TNodeMeta, TEdgeMeta>(
  result: IFragmentNetworkResult<TNodeMeta, TEdgeMeta>
): boolean {
  const { fragments, errors } = result;
  try {
    assert.equal(errors?.length, 0, "Should be no errors discovered");

    fragments.forEach((network) => {
      assert.equal(
        network.nodes.length,
        network.nodeMap.size,
        "Node map should have the same number of nodes as the nodes array"
      );

      network.nodes.forEach((node) => {
        assert(network.nodeMap.has(node.id), "Node should be in the node map");
        assert(
          network.nodeMap.get(node.id) === node,
          "Node in node map should be the same object as the node in the nodes array"
        );

        node.in.forEach((edge) => {
          assert(
            network.edgeMap.has(edge.id),
            "Edge should be in the edge map"
          );
          assert(
            network.edgeMap.get(edge.id) === edge,
            "Edge in edge map should be the same object as the edge in the in array"
          );
          assert(
            network.edges.includes(edge),
            "Edge should be located in the edges array"
          );
        });

        node.out.forEach((edge) => {
          assert(
            network.edgeMap.has(edge.id),
            "Edge should be in the edge map"
          );
          assert(
            network.edgeMap.get(edge.id) === edge,
            "Edge in edge map should be the same object as the edge in the in array"
          );
          assert(
            network.edges.includes(edge),
            "Edge should be located in the edges array"
          );
        });
      });

      network.edges.forEach((edge) => {
        assert(
          network.nodes.includes(edge.in),
          `The edge node in should be in the network nodes \n  {node id: ${
            edge.in.id
          }, node id in lookup: ${network.nodeMap.has(edge.in.id)}}`
        );
        assert(
          network.nodes.includes(edge.out),
          `The edge node out should be in the network nodes \n  {node id: ${
            edge.out.id
          }, node id in lookup: ${network.nodeMap.has(edge.out.id)}}`
        );
      });
    });
  } catch (err) {
    console.error("VALIDATE FRAGMENT OPERATION ERROR:");
    console.error(err.stack || err.message);
    return false;
  }

  return true;
}
