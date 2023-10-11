import { Vec4 } from "deltav";
import { Identifier, networkUID } from "../../ui";
import { getColorOptions } from "./colors";
import { orderedRandItems } from "./random";
import { TestEdge, TestNode } from "./types";
import { randPhrase, randWord } from "./word-list";
import * as randomSeed from "random-seed";

/**
 * Generates test node meta data with a specified UID
 */
export function genNodeMeta(
  rand: (max: number) => number,
  color: Vec4,
  id?: Identifier
) {
  return {
    name: randPhrase(rand, 3),
    UID: id ?? networkUID(),
    dateMetric: new Date(),
    numMetric: rand(10) + 1,
    strMetric: randWord(rand),
    color,
  };
}

/**
 * Generates ramdonized node data. Each node for a given index will always be
 * the same:
 *
 * genNodes(5) === genNodes(5) (deeply equals, not object pointer equals) also
 *
 * genNodes(5) === genNodes(15) for the first 5 nodes
 */
export function genNodesMeta(count: number) {
  const colors = getColorOptions(count);
  const rand: (max: number) => number = randomSeed.create("nodes");
  const out: TestNode[] = [];

  for (let i = 0; i < count; ++i) {
    out.push(genNodeMeta(rand, colors[i]));
  }

  return out;
}

/**
 * Generate an edge for two nodes with randomized metrics.
 */
export function genEdgeMeta(
  rand: (max: number) => number,
  in_?: TestNode,
  out_?: TestNode,
  id?: Identifier
): TestEdge {
  return {
    name: randPhrase(rand, 3),
    UID: id ?? networkUID(),
    UID_IN: in_?.UID ?? -1,
    UID_OUT: out_?.UID ?? -1,
    dateMetric: new Date(),
    numMetric: rand(10),
    strMetric: randWord(rand),
    color: [Math.random(), Math.random(), Math.random(), 255],
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
export function genEdgesMeta(nodes: TestNode[], count: number) {
  const rand = randomSeed.create("edges");
  const out: TestEdge[] = [];

  for (let i = 0; i < count; ++i) {
    const pickTwo = orderedRandItems(rand, nodes, 2);
    if (!pickTwo) continue;
    out.push(genEdgeMeta(rand, pickTwo[0], pickTwo[1]));
  }

  return out;
}

/**
 * Generates two edge rows that both combined represent a single edge.
 */
export function genEdgeMetaPair(
  rand: (max: number) => number,
  in_: TestNode,
  out_: TestNode
) {
  const UID = networkUID();

  return [
    {
      name: randPhrase(rand, 3),
      UID,
      UID_IN: in_.UID,
      dateMetric: new Date(),
      numMetric: rand(10),
      strMetric: randWord(rand),
    },
    {
      name: randPhrase(rand, 3),
      UID,
      UID_OUT: out_.UID,
      dateMetric: new Date(),
      numMetric: rand(10),
      strMetric: randWord(rand),
    },
  ];
}
