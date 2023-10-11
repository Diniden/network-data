import { describe, test } from "@jest/globals";
import assert from "assert";
import { addNode, makeNode, networkUID } from "../ui";
import { genEdgeMeta, genNodesMeta } from "./data/node-edge-base";
import { orderedRandItems } from "./data/random";
import { makeNetworkFlower, makeRandomNetwork } from "./data/test-networks";
import * as randomSeed from "random-seed";

describe("add-node", () => {
  test("Should not modify the network with no new nodes", async () => {
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const check = addNode(network, []);
    assert.equal(check.nodes.size, 0);
    assert.equal(network.nodes.length, 101);
    assert.equal(network.edges.length, 100);

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a single node with no edges", async () => {
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const check = addNode(
      network,
      makeNode(
        (meta) => meta?.UID ?? networkUID(),
        [],
        [],
        0,
        genNodesMeta(1)[0]
      )
    );
    assert.equal(check.nodes.size, 1);
    assert.equal(network.nodes.length, 102);
    assert.equal(network.edges.length, 100);

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a single node with one incoming edge", async () => {
    const rand = randomSeed.create("test");
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      makeNode(
        (meta) => meta?.UID ?? networkUID(),
        [{ node: network.nodes[0], edge: { meta: genEdgeMeta(rand) } }],
        [],
        0,
        genNodesMeta(1)[0]
      )
    );

    assert.equal(check.nodes.size, 1);
    assert.equal(check.edges.size, 1);
    assert.equal(network.nodes.length, 102);
    assert.equal(network.edges.length, 101);

    check.nodes.forEach((n) => {
      assert.equal(n.in.length, 1, "Should have one incoming edge");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a single node with one outgoing edge", async () => {
    const rand = randomSeed.create("test");
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      makeNode(
        (meta) => meta?.UID ?? networkUID(),
        [],
        [{ node: network.nodes[0], edge: { meta: genEdgeMeta(rand) } }],
        0,
        genNodesMeta(1)[0]
      )
    );

    assert.equal(check.nodes.size, 1);
    assert.equal(check.edges.size, 1);
    assert.equal(network.nodes.length, 102);
    assert.equal(network.edges.length, 101);

    check.nodes.forEach((n) => {
      assert.equal(n.out.length, 1, "Should have one outgoing edge");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a single node with several edges", async () => {
    const rand = randomSeed.create("test");
    const network = await makeRandomNetwork(101, 0);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      makeNode(
        (meta) => meta?.UID ?? networkUID(),
        orderedRandItems(rand, network.nodes, 30).map((n) => ({
          node: n,
          edge: { meta: genEdgeMeta(rand) },
        })),
        orderedRandItems(rand, network.nodes, 30).map((n) => ({
          node: n,
          edge: { meta: genEdgeMeta(rand) },
        })),
        0,
        genNodesMeta(1)[0]
      )
    );

    assert.equal(check.nodes.size, 1, "Should have only added 1 node");
    assert.equal(check.edges.size, 60, "Should have added 60 edges");
    assert.equal(
      network.nodes.length,
      102,
      "Should have all new nodes created"
    );
    assert.equal(network.edges.length, 60, "Should have all new edges created");

    check.nodes.forEach((n) => {
      assert.equal(n.out.length, 30, "Should have 30 outgoing edges");
      assert.equal(n.in.length, 30, "Should have 30 incoming edges");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a several nodes with several edges", async () => {
    const rand = randomSeed.create("test");
    const network = await makeRandomNetwork(101, 0);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      new Array(30).fill(0).map(() =>
        makeNode(
          (meta) => meta?.UID ?? networkUID(),
          orderedRandItems(rand, network.nodes, 10).map((n) => ({
            node: n,
            edge: { meta: genEdgeMeta(rand) },
          })),
          orderedRandItems(rand, network.nodes, 10).map((n) => ({
            node: n,
            edge: { meta: genEdgeMeta(rand) },
          })),
          0,
          genNodesMeta(1)[0]
        )
      )
    );

    assert.equal(check.nodes.size, 30, "Should have only added 30 node");
    assert.equal(
      check.edges.size,
      600,
      "Should have added 200 edges (20 edges per node)"
    );
    assert.equal(
      network.nodes.length,
      131,
      "Should have all new nodes created"
    );
    assert.equal(
      network.edges.length,
      600,
      "Should have all new edges created"
    );

    check.nodes.forEach((n) => {
      assert.equal(n.out.length, 10, "Should have 10 outgoing edges");
      assert.equal(n.in.length, 10, "Should have 10 incoming edges");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add a several nodes with no edges", async () => {
    const network = await makeRandomNetwork(101, 0);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      new Array(30)
        .fill(0)
        .map(() =>
          makeNode(
            (meta) => meta?.UID ?? networkUID(),
            [],
            [],
            0,
            genNodesMeta(1)[0]
          )
        )
    );

    assert.equal(check.nodes.size, 30, "Should have only added 30 node");
    assert.equal(check.edges.size, 0, "Should have added 0 edges");
    assert.equal(
      network.nodes.length,
      131,
      "Should have all new nodes created"
    );
    assert.equal(network.edges.length, 0, "Should have no new edges created");

    check.nodes.forEach((n) => {
      assert.equal(n.out.length, 0, "Should have 0 outgoing edges");
      assert.equal(n.in.length, 0, "Should have 0 incoming edges");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });

  test("Should add nodes not in network via edges associated with the nodes", async () => {
    const rand = randomSeed.create("test");
    const network = await makeRandomNetwork(100, 0);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const check = addNode(
      network,
      new Array(30).fill(0).map(() =>
        makeNode(
          (meta) => meta?.UID ?? networkUID(),
          {
            node: makeNode(
              (meta) => meta?.UID ?? networkUID(),
              [],
              [],
              0,
              genNodesMeta(1)[0]
            ),
            edge: { meta: genEdgeMeta(rand) },
          },
          {
            node: makeNode(
              (meta) => meta?.UID ?? networkUID(),
              [],
              [],
              0,
              genNodesMeta(1)[0]
            ),
            edge: { meta: genEdgeMeta(rand) },
          },
          0,
          genNodesMeta(1)[0]
        )
      )
    );

    assert.equal(
      check.nodes.size,
      90,
      "Should have only added 90 nodes (30 added connected to 2 nodes out of network each)"
    );
    assert.equal(
      check.edges.size,
      60,
      "Should have added 60 edges (2 per primary added node)"
    );
    assert.equal(
      network.nodes.length,
      190,
      "Should have all new nodes created"
    );
    assert.equal(network.edges.length, 60, "Should have edges created");

    check.nodes.forEach((n) => {
      assert(n.out.length + n.in.length >= 1, "Should have at least 1 edge");
    });

    nodes.forEach((n, i) =>
      assert.equal(
        network.nodes[i],
        n,
        "Old node should be the same in network"
      )
    );
    edges.forEach((e, i) =>
      assert.equal(
        network.edges[i],
        e,
        "Old edge should be the same in network"
      )
    );
  });
});
