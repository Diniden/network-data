import { makeNetwork } from "../../ui";
import { genEdgeMeta, genEdgesMeta, genNodesMeta } from "./node-edge-base";
import * as randomSeed from "random-seed";

const rand = randomSeed.create("edge");
type TestEdge = ReturnType<typeof genEdgesMeta>[number];
type TestNode = ReturnType<typeof genNodesMeta>[number];

export const makeLinkedList = (size: number) => {
  const nodes = genNodesMeta(size);
  const edges: TestEdge[] = [];

  nodes.reduce((prev, curr) => {
    edges.push(genEdgeMeta(rand, prev, curr));
    return curr;
  });

  // Easy helper for the circular list to retrieve nodes that are evenly spaced
  // in the list. All retrievals start with the first node.
  const getEvenPoints = (count: number) => {
    if (count < 1) return [];
    if (count < 2) return [nodes[0]];
    if (count > nodes.length) return nodes.slice(0);

    const step = nodes.length / count;
    const points: TestNode[] = [];

    for (let i = 0; i < count; i++) {
      points.push(nodes[Math.floor(i * step)]);
    }

    return points;
  };

  return { nodes, edges, getEvenPoints };
};

export const makeCircularList = (size: number) => {
  const nodes = genNodesMeta(size);
  const edges: TestEdge[] = [];

  nodes.reduce((prev, curr) => {
    edges.push(genEdgeMeta(rand, prev, curr));
    return curr;
  });

  edges.push(genEdgeMeta(rand, nodes[nodes.length - 1], nodes[0]));

  // Easy helper for the circular list to retrieve nodes that are evenly spaced
  // in the list. All retrievals start with the first node.
  const getEvenPoints = (count: number) => {
    if (count < 1) return [];
    if (count < 2) return [nodes[0]];
    if (count > nodes.length) return nodes.slice(0);

    const step = nodes.length / count;
    const points: TestNode[] = [];

    for (let i = 0; i < count; i++) {
      points.push(nodes[Math.floor(i * step)]);
    }

    return points;
  };

  return { nodes, edges, getEvenPoints };
};

export const makeRandom = (
  nodeCount: number,
  edgeCount: number,
  ensureConnections?: boolean
) => {
  if (nodeCount < 2) throw Error("Random networks must have at least 2 nodes");

  // To ensure connections, we will take the cheap route and simply start with a
  // linked list, then add random interconnections.
  if (ensureConnections) {
    const { nodes, edges } = makeLinkedList(nodeCount);

    if (edgeCount < nodeCount - 1) {
      console.warn(
        "There needs to be more edges than nodes to ensure all nodes are connected"
      );
    }

    const remainingEdges = edgeCount - (nodeCount - 1);

    if (remainingEdges > 0) {
      const randomEdges = genEdgesMeta(nodes, remainingEdges);
      edges.push(...randomEdges);
    }

    return {
      nodes,
      edges,
    };
  } else {
    const nodes = genNodesMeta(nodeCount);
    const edges = genEdgesMeta(nodes, edgeCount);

    return {
      nodes,
      edges,
    };
  }
};

export const makeFlower = (size: number) => {
  const nodes = genNodesMeta(size);
  const firstNode = nodes[0];
  const edges: TestEdge[] = [];

  nodes.slice(1).forEach((node) => {
    edges.push(genEdgeMeta(rand, firstNode, node));
  });

  return { nodes, edges };
};

export const makeTestNetwork = async (nodes: TestNode[], edges: TestEdge[]) =>
  await makeNetwork({
    nodeData: nodes,
    nodeId: (n) => n.UID,
    nodeMeta: (n) => n,

    edgeData: edges,
    edgeId: (e) => e.UID,
    edgeIn: (e) => e.UID_IN,
    edgeOut: (e) => e.UID_OUT,
    edgeMeta: (e) => e,
  });

/**
 * Makes a network that is just a cluster of nodes with no edges.
 */
export const makeNonNetwork = async (size: number) => {
  const nodes = genNodesMeta(size);
  const edges: TestEdge[] = [];

  return makeNetwork({
    nodeData: nodes,
    nodeId: (n) => n.UID,
    nodeMeta: (n) => n,

    edgeData: edges,
    edgeId: (e) => e.UID,
    edgeIn: (e) => e.UID_IN,
    edgeOut: (e) => e.UID_OUT,
    edgeMeta: (e) => e,
  });
};

/**
 * Makes a network data type that is a simply linear list of nodes
 */
export const makeNetworkLinkedList = async (size: number) => {
  const { nodes, edges } = makeLinkedList(size);

  const network = await makeNetwork({
    nodeData: nodes,
    nodeId: (d) => d.UID,
    nodeMeta: (d) => d,

    edgeData: edges,
    edgeId: (d) => d.UID,
    edgeMeta: (d) => d,
    edgeIn: (d) => d.UID_IN,
    edgeOut: (d) => d.UID_OUT,
  });

  return network;
};

/**
 * Makes a network of nodes that aren't linked in a circular fashion that does
 * not have any edges that interconnect within the circle.
 */
export const makeNetworkCircularList = async (size: number) => {
  const { nodes, edges } = makeCircularList(size);

  const network = await makeNetwork({
    nodeData: nodes,
    nodeId: (d) => d.UID,
    nodeMeta: (d) => d,

    edgeData: edges,
    edgeId: (d) => d.UID,
    edgeMeta: (d) => d,
    edgeIn: (d) => d.UID_IN,
    edgeOut: (d) => d.UID_OUT,
  });

  return network;
};

/**
 * Generates a network of nodes with randomized connections.
 */
export const makeRandomNetwork = async (
  nodeCount: number,
  edgeCount: number,
  ensureConnections?: boolean
) => {
  const { nodes, edges } = makeRandom(nodeCount, edgeCount, ensureConnections);

  const network = await makeNetwork({
    nodeData: nodes,
    nodeId: (d) => d.UID,
    nodeMeta: (d) => d,

    edgeData: edges,
    edgeId: (d) => d.UID,
    edgeMeta: (d) => d,
    edgeIn: (d) => d.UID_IN,
    edgeOut: (d) => d.UID_OUT,
  });

  return network;
};

/**
 * Makes a network flower with the first node as the center of the bloom.
 */
export const makeNetworkFlower = async (count: number) => {
  const { nodes, edges } = makeFlower(count);

  const network = await makeNetwork({
    nodeData: nodes,
    nodeId: (d) => d.UID,
    nodeMeta: (d) => d,

    edgeData: edges,
    edgeId: (d) => d.UID,
    edgeMeta: (d) => d,
    edgeIn: (d) => d.UID_IN,
    edgeOut: (d) => d.UID_OUT,
  });

  return network;
};

/**
 * Makes a complex network structure with loops, flowers, and disjoint sets.
 */
export async function makeNetworkComplex(
  groupCount: number,
  looseNodes: number,
  flowerCount: number = 25,
  flowerPetals: number = 50
) {
  const rand = randomSeed.create("complex");
  let edges: TestEdge[] = [];
  let nodes: TestNode[] = [];

  // Make some complex networks
  for (let i = 0, iMax = groupCount; i < iMax; ++i) {
    const list = makeCircularList(flowerCount);
    edges = edges.concat(list.edges);
    nodes = nodes.concat(list.nodes);

    const flowers = new Array(flowerCount).fill(0).map(() => {
      const flower = makeFlower(flowerPetals);
      edges = edges.concat(flower.edges);
      nodes = nodes.concat(flower.nodes);
      return flower;
    });

    for (let i = 0, iMax = list.nodes.length; i < iMax; ++i) {
      const node = list.nodes[i];
      const flower = flowers[i];
      edges.push(genEdgeMeta(rand, node, flower.nodes[0]));
    }
  }

  // Pepper in nodes with no edges
  nodes = nodes.concat(genNodesMeta(looseNodes));

  return makeTestNetwork(nodes, edges);
}
