import { describe, test } from "@jest/globals";
import assert from "assert";
import { addEdge, INode, makeNode, networkUID } from "../ui";
import { makeEdge } from "../ui/data/make-edge";
import { genEdgeMeta, genNodesMeta } from "./data/node-edge-base";
import { orderedRandItems } from "./data/random";
import { makeNetworkFlower, makeRandomNetwork } from "./data/test-networks";
import { TestEdge, TestNode } from "./data/types";
import * as randomSeed from "random-seed";

describe("add-edge", () => {
  test("Should not modify the network edges but no nodes", async () => {
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const check = addEdge(network, []);
    assert.equal(check.edges.size, 0);
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

  test("Should add a single edge between existing nodes", async () => {
    const rand = randomSeed.create("test");
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const check = addEdge(
      network,
      makeEdge(
        (data) => data?.UID ?? networkUID(),
        nodes[1],
        nodes[2],
        1,
        1,
        genEdgeMeta(rand, nodes[1].meta, nodes[2].meta)
      )
    );
    assert.equal(check.edges.size, 1);
    assert.equal(network.nodes.length, 101);
    assert.equal(network.edges.length, 101);

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

  test("Should add an incoming and outgoing edge between same two nodes", async () => {
    const rand = randomSeed.create("test");
    const network = await makeNetworkFlower(101);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);

    const newEdges = [
      makeEdge(
        (data) => data?.UID ?? networkUID(),
        nodes[1],
        nodes[2],
        1,
        1,
        genEdgeMeta(rand, nodes[1].meta, nodes[2].meta)
      ),
      makeEdge(
        (data) => data?.UID ?? networkUID(),
        nodes[2],
        nodes[1],
        1,
        1,
        genEdgeMeta(rand, nodes[1].meta, nodes[2].meta)
      ),
    ];

    const newEdgeSet = new Set(newEdges);
    const check = addEdge(network, newEdges);

    assert(!check.nodeErrors);
    assert(!check.edgeErrors);
    assert.equal(
      check.edges.size,
      2,
      "Operation result should have 2 added edges"
    );
    assert.equal(
      network.nodes.length,
      101,
      "Network should have same number of nodes"
    );
    assert.equal(network.edges.length, 102, "Network should have 2 more edges");

    assert.equal(
      nodes[1].out.filter((e) => newEdgeSet.has(e)).length,
      1,
      "Node should have 1 outgoing edge of the new edges"
    );
    assert.equal(
      nodes[1].in.filter((e) => newEdgeSet.has(e)).length,
      1,
      "Node should have 1 incoming edge of the new edges"
    );
    assert.equal(
      nodes[2].out.filter((e) => newEdgeSet.has(e)).length,
      1,
      "Node should have 1 outgoing edge of the new edges"
    );
    assert.equal(
      nodes[2].in.filter((e) => newEdgeSet.has(e)).length,
      1,
      "Node should have 1 incoming edge of the new edges"
    );

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

  test("Should add several edges between existing nodes", async () => {
    const rand = randomSeed.create("test");
    const network = await makeRandomNetwork(100, 0);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const check = addEdge(
      network,
      new Array(100).fill(0).map(() => {
        const [n1, n2] = orderedRandItems(rand, nodes, 2);

        return makeEdge(
          (data) => data?.UID ?? networkUID(),
          n1,
          n2,
          1,
          1,
          genEdgeMeta(rand, n1.meta, n2.meta)
        );
      })
    );

    assert(!check.nodeErrors);
    assert(!check.edgeErrors);
    assert.equal(check.edges.size, 100);
    assert.equal(network.nodes.length, 100);
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

  test("Should add a single edge and single node between nodes where one is in network and one is not", async () => {
    const rand = randomSeed.create("test");
    const network = await makeNetworkFlower(100);
    const nodes = network.nodes.slice(0);
    const edges = network.edges.slice(0);
    const detachedNode: INode<TestNode, TestEdge> = makeNode(
      (data) => data?.UID ?? networkUID(),
      void 0,
      void 0,
      0,
      genNodesMeta(1)[0]
    );

    const check = addEdge(
      network,
      makeEdge(
        (data) => data?.UID ?? networkUID(),
        nodes[1],
        detachedNode,
        1,
        1,
        genEdgeMeta(rand, nodes[1].meta, detachedNode.meta)
      )
    );

    assert(!check.nodeErrors);
    assert(!check.edgeErrors);
    assert.equal(check.edges.size, 1);
    assert.equal(check.nodes.size, 1);
    assert.equal(network.nodes.length, 101);
    assert.equal(network.edges.length, 100);

    check.edges.forEach((v) => {
      assert.equal(
        v.in,
        nodes[1],
        "The in node should be the node in the network"
      );
      assert.equal(
        v.out,
        detachedNode,
        "The out node should be the node not in the network"
      );
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
