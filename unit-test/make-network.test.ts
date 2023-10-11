import { describe, jest, test } from "@jest/globals";
import assert from "assert";
import path from "path";
import { INetworkData, isNetworkData, makeNetwork } from "../ui";
import {
  genEdgeMeta,
  genEdgeMetaPair,
  genEdgesMeta,
  genNodesMeta,
} from "./data/node-edge-base";
import { TestEdge } from "./data/types";
import * as randomSeed from "random-seed";

function assertSingleLink(network: INetworkData<any, any>) {
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
}

describe("make-network", () => {
  test("Should make a network", async () => {
    const nodes = genNodesMeta(100);
    const edges = genEdgesMeta(nodes, 1000);

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

  test("Should make an empty network", async () => {
    let nodes = genNodesMeta(0);
    let edges = genEdgesMeta(nodes, 0);

    let network = await makeNetwork({
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
    assert(network.nodes.length === 0, "Network should have 0 nodes");
    assert(network.edges.length === 0, "Network should have 0 edges");

    nodes = genNodesMeta(0);
    edges = genEdgesMeta(nodes, 1000);

    network = await makeNetwork({
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
    assert(network.nodes.length === 0, "Network should have 0 nodes");
    assert(network.edges.length === 0, "Network should have 0 edges");
  });

  test("Should link two nodes", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(2);
    const edge = genEdgeMeta(rand, nodes[0], nodes[1]);

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

    assertSingleLink(network);
  });

  test("Should exclude useless edge", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(2);
    const edge = genEdgeMeta(rand, nodes[0], nodes[1]);
    const noConnection = genEdgeMeta(rand, nodes[0], nodes[0]);
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

  test("Should exclude partial edge", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(2);
    const edge = genEdgeMeta(rand, nodes[0], nodes[1]);
    const partialOnIn = genEdgeMeta(rand, nodes[0], nodes[0]);
    partialOnIn.UID_OUT = -1;
    const partialOnOut = genEdgeMeta(rand, nodes[0], nodes[0]);
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

  test("Should keep disconnected nodes", async () => {
    let nodes = genNodesMeta(100);
    const edges = genEdgesMeta(nodes, 1000);

    const hasEdge = new Set();
    edges.forEach((e) => {
      hasEdge.add(e.UID_IN);
      hasEdge.add(e.UID_OUT);
    });

    nodes = nodes.filter((n) => hasEdge.has(n.UID));

    // Add in some nodes with no edges
    nodes = nodes.concat(genNodesMeta(10));

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

  test("Should make a linked list", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(100);
    const edges: TestEdge[] = [];

    nodes.reduce((prev, curr) => {
      edges.push(genEdgeMeta(rand, prev, curr));
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
    assert(
      network.nodes[0].out.length === 1,
      "First node should have 1 out edge"
    );
    assert(
      network.nodes[0].in.length === 0,
      "First node should have 0 in edges"
    );
    // Last node should have one in edge and no out edges
    assert(
      network.nodes[99].out.length === 0,
      "Last node should have 0 out edges"
    );
    assert(
      network.nodes[99].in.length === 1,
      "Last node should have 1 in edge"
    );

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

  test("Should make a circular list", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(100);
    const edges: TestEdge[] = [];

    nodes.reduce((prev, curr) => {
      edges.push(genEdgeMeta(rand, prev, curr));
      return curr;
    });

    edges.push(genEdgeMeta(rand, nodes[nodes.length - 1], nodes[0]));

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

  test("Should handle edge information spread out", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(2);
    const edges = genEdgeMetaPair(rand, nodes[0], nodes[1]);

    const network = await makeNetwork({
      aggregateResults: true,

      nodeData: nodes,
      nodeId: (d) => d.UID,
      nodeMeta: (d) => d,

      edgeData: edges,
      edgeId: (d) => d.UID,
      edgeMeta: (d) => d,
      edgeIn: (d) => d.UID_IN,
      edgeOut: (d) => d.UID_OUT,
    });

    assertSingleLink(network);
  });

  test("Should discard useless partial edge information", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(2);
    const edges = genEdgeMetaPair(rand, nodes[0], nodes[1]);
    const edges2 = genEdgeMetaPair(rand, nodes[0], nodes[1]);
    edges2[0].UID_IN = -1;
    edges2[0].UID_OUT = void 0;

    const network = await makeNetwork({
      aggregateResults: true,

      nodeData: nodes,
      nodeId: (d) => d.UID,
      nodeMeta: (d) => d,

      edgeData: [...edges, ...edges2],
      edgeId: (d) => d.UID,
      edgeMeta: (d) => d,
      edgeIn: (d) => d.UID_IN,
      edgeOut: (d) => d.UID_OUT,
    });

    assertSingleLink(network);
  });

  test("Should make a linked list with partial edge rows", async () => {
    const rand = randomSeed.create("edge");
    const nodes = genNodesMeta(100);
    const edges: ReturnType<typeof genEdgeMetaPair>[number][] = [];

    nodes.reduce((prev, curr) => {
      edges.push(...genEdgeMetaPair(rand, prev, curr));
      return curr;
    });

    const network = await makeNetwork({
      aggregateResults: true,

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
    assert.equal(network.nodes.length, 100, "Network should have 100 nodes");
    assert.equal(network.edges.length, 99, "Network should have 99 edges");
    assert.equal(
      network.nodes[0].out.length,
      1,
      "First node should have 1 out edge"
    );
    assert.equal(
      network.nodes[0].in.length,
      0,
      "First node should have 0 in edges"
    );
    // Last node should have one in edge and no out edges
    assert.equal(
      network.nodes[99].out.length,
      0,
      "Last node should have 0 out edges"
    );
    assert.equal(
      network.nodes[99].in.length,
      1,
      "Last node should have 1 in edge"
    );

    network.nodes.reduce((prev, curr) => {
      assert.equal(
        curr.in.length,
        1,
        `Node ${curr.id} should have 1 incoming edge`
      );
      assert.equal(curr.in[0].out, curr, `Incoming edge should link to node`);
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
      assert.equal(prev.out[0], curr.in[0], `Nodes should be linked by edge`);
      return curr;
    });
  });
});

if (process.env.SKIP_LONG_TESTS !== "true") {
  describe("make-network with datasets", function () {
    jest.setTimeout(30000);

    test("Should convert data from file to a graph", async () => {
      const LineByLineReader = require("line-by-line");
      const dataPath = path.join(__dirname, "../datasets", "email-Enron.txt");
      let lr = new LineByLineReader(dataPath);
      lr.pause();
      const nodes = new Set();

      // Make an async generator to read all lines of the file
      const getNodeData = async function* () {
        let complete = false;
        let resolveLine: Function;
        let linePromise = new Promise<string | void>((r) => (resolveLine = r));

        lr.on("line", (line: string) => {
          // Skip comments
          if (!line.trim().startsWith("#")) {
            resolveLine(line);
            lr.pause();
          }
        });

        lr.on("end", () => {
          // All lines are read, file is closed now.
          resolveLine();
          complete = true;
        });

        lr.on("error", (err: Error) => {
          console.warn("Error reading file", err.stack || err.message);
        });

        lr.resume();

        while (!complete) {
          const line = await linePromise;
          linePromise = new Promise<string | void>((r) => (resolveLine = r));

          // Close the line reader and reboot it for the edge data
          if (line === void 0) {
            lr.close();
            lr = new LineByLineReader(dataPath);
            return;
          } else if (!line.trim()) {
            lr.resume();
          } else {
            const splits = line.split("\t");
            yield splits[0].trim();
            yield splits[1].trim();
            nodes.add(splits[0].trim());
            nodes.add(splits[1].trim());
            lr.resume();
          }
        }
      };

      const getLineData = async function* () {
        let complete = false;
        let resolveLine: Function;
        let linePromise = new Promise<string | void>((r) => (resolveLine = r));

        lr.on("line", (line: string) => {
          // Skip comments
          if (!line.trim().startsWith("#")) {
            resolveLine(line);
            lr.pause();
          }
        });

        lr.on("end", () => {
          // All lines are read, file is closed now.
          resolveLine();
          complete = true;
        });

        lr.resume();

        while (!complete) {
          const line = await linePromise;
          linePromise = new Promise<string | void>((r) => (resolveLine = r));

          // Close the line reader and reboot it for the edge data
          if (line === void 0) {
            lr.close();
            lr = new LineByLineReader(dataPath);
            return;
          } else if (!line.trim()) {
            lr.resume();
          } else {
            yield line
              .split("\t")
              .map((s) => s.trim())
              .sort();
            lr.resume();
          }
        }
      };

      const network = await makeNetwork({
        aggregateResults: true,

        nodeData: getNodeData,
        nodeId: (d) => d || "",
        nodeMeta: (d) => d,

        edgeData: getLineData,
        edgeId: (d) => `${d[0]}-${d[1]}`,
        edgeMeta: (d) => d,
        edgeIn: (d) => d[0],
        edgeOut: (d) => d[1],
      });

      assert.equal(
        network.nodes.length,
        nodes.size,
        "Network should have produced same number of node ids as the file"
      );
    });
  });
}
