import { orderedRandItems } from "./random";
import { TestEdge, TestNode } from "./types";
import { randPhrase, randWord } from "./word-list";
const randomSeed = require("random-seed");

let NODE_UID = 0;
let EDGE_UID = 0;

/**
 * Generates ramdonized node data. Each node for a given index will always be the same:
 * genNodes(5) === genNodes(5) (deeply equals, not object pointer equals)
 * also
 * genNodes(5) === genNodes(15) for the first 5 nodes
 */
export function genNodes(count: number) {
  const rand: (max: number) => number = randomSeed.create("nodes");
  const out: TestNode[] = [];

  for (let i = 0; i < count; ++i) {
    out.push({
      name: randPhrase(rand, 3),
      UID: ++NODE_UID,
      dateMetric: new Date(),
      numMetric: rand(1000),
      strMetric: randWord(rand),
    });
  }

  return out;
}

/**
 * Generate an edge for two nodes with randomized metrics.
 */
export function genEdge(
  rand: (max: number) => number,
  in_: TestNode,
  out_: TestNode
) {
  return {
    name: randPhrase(rand, 3),
    UID: ++EDGE_UID,
    UID_IN: in_.UID,
    UID_OUT: out_.UID,
    dateMetric: new Date(),
    numMetric: rand(1000),
    strMetric: randWord(rand),
  };
}

/**
 * Generates randomized edge data. Each node for a given index will always be the same if the input node list is
 * the same:
 * nodes = genNodes(5)
 * genEdges(nodes, 5) === genEdges(nodes, 5) (deeply equals, not object pointer equals)
 * also
 * genEdges(nodes, 5) === genEdges(nodes, 15) for the first 5 edges
 */
export function genEdges(nodes: TestNode[], count: number) {
  const rand = randomSeed.create("edges");
  const out: TestEdge[] = [];

  for (let i = 0; i < count; ++i) {
    const pickTwo = orderedRandItems(rand, nodes, 2);
    if (!pickTwo) continue;
    out.push(genEdge(rand, pickTwo[0], pickTwo[1]));
  }

  return out;
}
