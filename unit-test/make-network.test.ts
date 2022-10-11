import assert from "assert";
import { describe, it } from "mocha";
import { isNetworkData, makeNetwork } from "../lib";
import { genEdge, genEdges, genNodes } from "./data/node-edge-base";
import { TestEdge } from "./data/types";

describe("Make Network", () => {
  it("Should make a network", async () => {
    const nodes = genNodes(100);
    const edges = genEdges(nodes, 1000);

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

    assert(isNetworkData(network), "Object produced is not network data");
  });

  it("Should link two nodes", async () => {
    const rand = require("random-seed").create("edge");
    const nodes = genNodes(2);
    const edge = genEdge(rand, nodes[0], nodes[1]);

    const network = await makeNetwork({
      nodeData: nodes,
      nodeId: (d) => d.UID,
      nodeMeta: (d) => d,

      edgeData: [edge],
      edgeId: (d) => d.UID,
      edgeMeta: (d) => d,
      edgeIn: (d) => d.UID_IN,
      edgeOut: (d) => d.UID_OUT,
    });

    assert(isNetworkData(network), "Object produced is not network data");
    assert(network.nodes.length === 2, "Network should have 2 nodes");
    assert(network.edges.length === 1, "Network should have 1 edge");
    assert(
      network.edges[0].in === network.nodes[0],
      "Edge IN should link to first node"
    );
    assert(
      network.edges[0].out === network.nodes[1],
      "Edge OUT should link to second node"
    );
    assert(
      network.nodes[0].out.length === 1,
      "First node should have 1 outgoing edge"
    );
    assert(
      network.nodes[0].out[0] === network.edges[0],
      "First node should have edge as outgoing"
    );
    assert(
      network.nodes[1].in.length === 1,
      "Second node should have 1 incoming edge"
    );
    assert(
      network.nodes[1].in[0] === network.edges[0],
      "Second node should have edge as incoming"
    );
  });

  it("Should exclude useless edge", async () => {
    const rand = require("random-seed").create("edge");
    const nodes = genNodes(2);
    const edge = genEdge(rand, nodes[0], nodes[1]);
    const noConnection = genEdge(rand, nodes[0], nodes[0]);
    noConnection.UID_IN = -1;
    noConnection.UID_OUT = -1;

    const network = await makeNetwork({
      nodeData: nodes,
      nodeId: (d) => d.UID,
      nodeMeta: (d) => d,

      edgeData: [edge, noConnection],
      edgeId: (d) => d.UID,
      edgeMeta: (d) => d,
      edgeIn: (d) => d.UID_IN,
      edgeOut: (d) => d.UID_OUT,
    });

    assert(isNetworkData(network), "Object produced is not network data");
    assert(network.nodes.length === 2, "Network should have 2 nodes");
    assert(network.edges.length === 1, "Network should have 1 edge");
    assert(network.nodes[0].out.length === 1, "First node should have 1 edge");
    assert(
      network.nodes[0].out[0].id !== noConnection.UID,
      "First node should not have noConnection"
    );
    assert(network.nodes[1].in.length === 1, "Second node should have 1 edge");
    assert(
      network.nodes[1].in[0].id !== noConnection.UID,
      "Second node should not have noConnection"
    );
  });

  it("Should exclude partial edge", async () => {
    const rand = require("random-seed").create("edge");
    const nodes = genNodes(2);
    const edge = genEdge(rand, nodes[0], nodes[1]);
    const partialOnIn = genEdge(rand, nodes[0], nodes[0]);
    partialOnIn.UID_OUT = -1;
    const partialOnOut = genEdge(rand, nodes[0], nodes[0]);
    partialOnOut.UID_IN = -1;

    const network = await makeNetwork({
      nodeData: nodes,
      nodeId: (d) => d.UID,
      nodeMeta: (d) => d,

      edgeData: [edge, partialOnIn, partialOnOut],
      edgeId: (d) => d.UID,
      edgeMeta: (d) => d,
      edgeIn: (d) => d.UID_IN,
      edgeOut: (d) => d.UID_OUT,
    });

    assert(isNetworkData(network), "Object produced is not network data");
    assert(network.nodes.length === 2, "Network should have 2 nodes");
    assert(network.edges.length === 1, "Network should have 1 edge");
    assert(network.nodes[0].out.length === 1, "First node should have 1 edge");
    assert(
      network.nodes[0].out[0].id !== partialOnIn.UID &&
        network.nodes[0].out[0].id !== partialOnOut.UID,
      "First node should not have partialOnIn or partialOnOut"
    );
    assert(network.nodes[1].in.length === 1, "Second node should have 1 edge");
    assert(
      network.nodes[1].in[0].id !== partialOnIn.UID &&
        network.nodes[1].in[0].id !== partialOnOut.UID,
      "Second node should not have partialOnIn or partialOnOut"
    );
  });

  it("Should keep disconnected nodes", async () => {
    let nodes = genNodes(100);
    const edges = genEdges(nodes, 1000);

    const hasEdge = new Set();
    edges.forEach((e) => {
      hasEdge.add(e.UID_IN);
      hasEdge.add(e.UID_OUT);
    });

    nodes = nodes.filter((n) => hasEdge.has(n.UID));

    // Add in some nodes with no edges
    nodes = nodes.concat(genNodes(10));

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

    assert(isNetworkData(network), "Object produced is not network data");
    assert(
      network.nodes.length === nodes.length,
      "Network should have all nodes"
    );
  });

  it("Should make a linked list", async () => {
    const rand = require("random-seed").create("edge");
    const nodes = genNodes(100);
    const edges: TestEdge[] = [];

    nodes.reduce((prev, curr) => {
      edges.push(genEdge(rand, prev, curr));
      return curr;
    });

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

    assert(isNetworkData(network), "Object produced is not network data");
    assert(network.nodes.length === 100, "Network should have 100 nodes");
    assert(network.edges.length === 99, "Network should have 99 edges");

    network.nodes.reduce((prev, curr) => {
      assert(
        curr.in.length === 1,
        `Node ${curr.id} should have 1 incoming edge`
      );
      assert(curr.in[0].out === curr, `Incoming edge should link to node`);
      assert(
        curr.out.length === 1 ||
          curr === network.nodes[network.nodes.length - 1],
        `Node should have 1 outgoing edge if not final node`
      );
      assert(
        curr === network.nodes[network.nodes.length - 1] ||
          curr.out[0].in === curr,
        `Outgoing edge should link to node if not final node`
      );
      assert(prev.out[0] === curr.in[0], `Nodes should be linked by edge`);
      return curr;
    });
  });

  it("Should make a circular list", async () => {
    const rand = require("random-seed").create("edge");
    const nodes = genNodes(100);
    const edges: TestEdge[] = [];

    nodes.reduce((prev, curr) => {
      edges.push(genEdge(rand, prev, curr));
      return curr;
    });

    edges.push(genEdge(rand, nodes[nodes.length - 1], nodes[0]));

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

    assert(isNetworkData(network), "Object produced is not network data");
    assert(network.nodes.length === 100, "Network should have 100 nodes");
    assert(network.edges.length === 100, "Network should have 100 edges");

    network.nodes.reduce((prev, curr) => {
      assert(
        curr.in.length === 1,
        `Node ${curr.id} should have 1 incoming edge`
      );
      assert(curr.in[0].out === curr, `Incoming edge should link to node`);
      assert(curr.out.length === 1, `Node should have 1 outgoing edge`);
      assert(curr.out[0].in === curr, `Outgoing edge should link to node`);
      assert(prev.out[0] === curr.in[0], `Nodes should be linked by edge`);
      return curr;
    });
  });
});
