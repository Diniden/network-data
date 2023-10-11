import { describe, test } from "@jest/globals";
import assert from "assert";
import { neighbors } from "../ui";
import { genEdgeMeta, genNodesMeta } from "./data/node-edge-base";
import {
  makeFlower,
  makeNetworkCircularList,
  makeNetworkFlower,
  makeNetworkLinkedList,
  makeNonNetwork,
  makeTestNetwork,
} from "./data/test-networks";
import * as randomSeed from "random-seed";

describe("neighbors", () => {
  test("Should return no neighbors", async () => {
    const network = await makeNonNetwork(100);

    const check = neighbors({
      node: network.nodes[0],
    });

    assert.equal(check.nodes.length, 0);
    assert.equal(check.edges.length, 0);
  });

  test("Should reciprocate results for two linked nodes", async () => {
    const network = await makeNetworkLinkedList(2);

    let check = neighbors({ node: network.nodes[0] });
    assert.equal(check.nodes[0], network.nodes[1], "Neighbor of 0 should be 1");

    check = neighbors({ node: network.nodes[1] });
    assert.equal(check.nodes[0], network.nodes[0], "Neighbor of 1 should be 0");
  });

  test("Should return linked list neighbors", async () => {
    const network = await makeNetworkLinkedList(100);

    // Check all of the middle nodes
    for (let i = 1, iMax = network.nodes.length - 1; i < iMax; ++i) {
      const node = network.nodes[i];
      const check = neighbors({ node });
      assert.equal(check.nodes.length, 2);
      assert.equal(check.edges.length, 2);
    }

    // Check the first node
    const check = neighbors({ node: network.nodes[0] });
    assert.equal(check.nodes.length, 1);
    assert.equal(check.edges.length, 1);

    // Check the last node
    const check2 = neighbors({ node: network.nodes[network.nodes.length - 1] });
    assert.equal(check2.nodes.length, 1);
    assert.equal(check2.edges.length, 1);
  });

  test("Should return circular list neighbors", async () => {
    const network = await makeNetworkCircularList(100);

    // Check all of the middle nodes
    for (let i = 0, iMax = network.nodes.length; i < iMax; ++i) {
      const node = network.nodes[i];
      const check = neighbors({ node });
      assert.equal(check.nodes.length, 2);
    }
  });

  test("Should return all neighbors", async () => {
    const network = await makeNetworkFlower(101);
    const check = neighbors({ node: network.nodes[0] });
    assert.equal(check.nodes.length, 100);
    assert.equal(check.edges.length, 100);
  });

  test("Should exclude some neighbors", async () => {
    const network = await makeNetworkFlower(101);
    const exclude = new Set([
      network.nodes[1],
      network.nodes[20],
      network.nodes[30],
    ]);
    const check = neighbors({ node: network.nodes[0], exclude });
    assert.equal(check.nodes.length, 97);
    assert.equal(check.edges.length, 97);

    for (const node of check.nodes) {
      assert(!exclude.has(node));
    }
  });

  test("Should not include input node", async () => {
    const network = await makeNetworkFlower(101);
    const check = neighbors({ node: network.nodes[0] });
    const all = new Set(check.nodes);
    assert(
      !all.has(network.nodes[0]),
      "Neighbors should not return the input node"
    );
  });

  test("Should only include one level of neighbors", async () => {
    const rand = randomSeed.create("test");
    const flowers = [];
    const edges = [];
    const nodes = [];
    const flowerCores = new Set();

    for (let i = 0; i < 10; ++i) {
      flowers.push(await makeFlower(100));
    }

    const rootNode = genNodesMeta(1)[0];
    nodes.push(rootNode);

    for (const flower of flowers) {
      edges.push(...flower.edges);
      nodes.push(...flower.nodes);
      edges.push(genEdgeMeta(rand, rootNode, flower.nodes[0]));
      flowerCores.add(flower.nodes[0]);
    }

    const network = await makeTestNetwork(nodes, edges);

    const check = neighbors({ node: network.nodes[0] });
    assert.equal(check.nodes.length, 10);
    assert.equal(check.edges.length, 10);

    for (const node of check.nodes) {
      assert(
        flowerCores.delete(node.meta),
        "Each node retrieved should have only been a flower core"
      );
    }

    assert.equal(
      flowerCores.size,
      0,
      "All flower cores should have been found"
    );
  });
});
