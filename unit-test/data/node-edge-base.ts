import { exclusiveRandItems } from "./random";
import { TestEdge, TestNode } from "./types";
import { randPhrase, randWord } from "./word-list";
const randomSeed = require('random-seed');

let NODE_UID = 0;
let EDGE_UID = 0;

/**
 * Generates ramdonized node data. Each node for a given index will always be the same:
 * genNodes(5) === genNodes(5) (deeply equals, not object pointer equals)
 * also
 * genNodes(5) === genNodes(15) for the first 5 nodes
 */
export function genNodes(count: number) {
  const rand = randomSeed.create('nodes');
  const out: TestNode[] = [];

  for (let i = 0; i < count; ++i) {
    out.push({
      name: randPhrase(rand, 3),
      UID: ++NODE_UID,
      dateMetric: new Date(),
      numMetric: rand(1000),
      strMetric: randWord(rand)
    });
  }

  return out;
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
  const rand = randomSeed.create('edges');
  const out: TestEdge[] = [];

  for (let i = 0; i < count; ++i) {
    const pickTwo = exclusiveRandItems(rand, nodes, 2);
    out.push({
      name: randPhrase(rand, 3),
      UID: ++EDGE_UID,
      UID_A: pickTwo[0].UID,
      UID_B: pickTwo[1].UID,
      dateMetric: new Date(),
      numMetric: rand(1000),
      strMetric: randWord(rand)
    });
  }

  return out;
}
