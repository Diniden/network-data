import { describe, test } from "@jest/globals";
import assert from "assert";
import { INode, ISpreadResult, ISpreadState, neighbors, spread } from "../ui";
import { genEdgeMeta, genNodesMeta } from "./data/node-edge-base";
import {
  makeFlower,
  makeLinkedList,
  makeNetworkCircularList,
  makeNetworkComplex,
  makeNetworkFlower,
  makeNetworkLinkedList,
  makeRandomNetwork,
  makeTestNetwork,
} from "./data/test-networks";
import { TestEdge, TestNode } from "./data/types";
import * as randomSeed from "random-seed";

describe("spread", () => {
  test("Should broadcast one set of results", async () => {
    const network = await makeRandomNetwork(100, 1000);

    const startNodes = new Set([
      network.nodes[0],
      network.nodes[1],
      network.nodes[2],
    ]);

    let count = 0;

    await spread({
      startNodes: Array.from(startNodes.values()),
      results: async (
        _result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        count++;
        return { stop: true };
      },
    });

    assert.equal(count, 1, "Should have only broadcasted one result");
  });

  test("Should broadcast initial nodes on first iteration", async () => {
    const network = await makeRandomNetwork(100, 1000);

    const startNodes = new Set([
      network.nodes[0],
      network.nodes[1],
      network.nodes[2],
    ]);

    await spread({
      startNodes: Array.from(startNodes.values()),
      results: async (result: ISpreadResult<TestNode, TestEdge>) => {
        assert.equal(result.nodes.length, 3);
        assert(startNodes.has(result.nodes[0]));
        assert(startNodes.has(result.nodes[1]));
        assert(startNodes.has(result.nodes[2]));
        return { stop: true };
      },
    });
  });

  test("Should broadcast to the end and stop broadcasting", async () => {
    const network = await makeNetworkLinkedList(100);
    let count = 0;
    let finalNode = network.nodes[-1];

    await spread({
      startNodes: [network.nodes[0]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        count++;
        finalNode = result.nodes[result.nodes.length - 1];
        return void 0;
      },
    });

    assert("Broadcast completed");
    assert.equal(
      count,
      100,
      "Should have broadcasted all the way to the end of the network"
    );
    assert(finalNode?.id !== void 0);
    assert.equal(
      finalNode?.id,
      network.nodes[network.nodes.length - 1].id,
      "Last node spread provided was not the last node of the linked list"
    );
  });

  test("Should spread to both ends", async () => {
    const network = await makeNetworkLinkedList(101);
    let count = 0;
    const finalNodes = [network.nodes[-1], network.nodes[-1]];

    // Start spreading from the exact middle so the spread hits both ends at the
    // same time
    await spread({
      startNodes: [network.nodes[50]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        count++;
        finalNodes[0] = result.nodes[0];
        finalNodes[1] = result.nodes[1];
        return void 0;
      },
    });

    assert("Broadcast completed");
    assert.equal(
      count,
      51,
      "Should have broadcasted all the way to the end of the network"
    );
    assert.notEqual(
      finalNodes[0],
      void 0,
      "Both final nodes should be populated"
    );
    assert.notEqual(
      finalNodes[1],
      void 0,
      "Both final nodes should be populated"
    );
    assert(
      finalNodes[0] === network.nodes[0] ||
        finalNodes[0] === network.nodes[100],
      "Final node should be the first or last node of the linked list"
    );
    assert(
      finalNodes[0] === network.nodes[0]
        ? finalNodes[1] === network.nodes[1]
        : finalNodes[1] === network.nodes[0],
      "Final node should be the first or last node of the linked list"
    );
  });

  test("Should spread to a final node", async () => {
    const network = await makeNetworkCircularList(10);
    let count = 0;
    let finalNodes = [network.nodes[-1]];

    await spread({
      startNodes: [network.nodes[0]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        count++;
        finalNodes = result.nodes;
        return void 0;
      },
    });

    assert("Broadcast completed");
    assert.equal(
      count,
      6,
      "Should have broadcasted all the way to the end of the network"
    );
    assert.equal(finalNodes.length, 1, "Final nodes should be one node");
    assert.equal(
      finalNodes[0].id,
      network.nodes[5].id,
      "Last node should be the node on the other side of the circle"
    );
  });

  test("Should spread to the equivalent of the neighbors query", async () => {
    const network = await makeNetworkFlower(101);
    let finalNodes = [network.nodes[-1]];

    await spread({
      startNodes: [network.nodes[0]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        finalNodes = result.nodes;
        return void 0;
      },
    });

    const siblings = neighbors({ node: network.nodes[0] });

    assert.equal(finalNodes.length, 100, "Final nodes should be 100 nodes");
    assert.equal(siblings.nodes.length, 100, "Siblings should be 100 nodes");
    assert.equal(
      finalNodes.length,
      siblings.nodes.length,
      "Should be the same number of nodes"
    );
    assert(
      finalNodes.every((node) => siblings.nodes.includes(node)),
      "All final nodes should be siblings"
    );
  });

  test("Should spread to gather all nodes between flower structures", async () => {
    const rand = randomSeed.create("test");
    const flower = makeFlower(101);
    const between = genNodesMeta(100);
    const endFlower = makeFlower(101);
    const edges: TestEdge[] = flower.edges.slice(0).concat(endFlower.edges);
    const nodes: TestNode[] = flower.nodes.slice(0).concat(endFlower.nodes);

    // Connect the in between with each flower ends
    for (let i = 0, iMax = between.length; i < iMax; ++i) {
      const node = between[i];
      const connect = flower.nodes[i + 1];
      const out = endFlower.nodes[i + 1];
      nodes.push(node);
      edges.push(genEdgeMeta(rand, connect, node));
      edges.push(genEdgeMeta(rand, node, out));
    }

    const checkBetween = new Set(between);
    const network = await makeTestNetwork(nodes, edges);
    let check = 0;

    const results = await spread({
      startNodes: [network.nodes[0]],
      results: async (
        _result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        check++;
        if (check === 3) return { stop: true };
        return { stop: false };
      },
    });

    assert(results, "Results from the spread were never determined");

    results.nodes.forEach((n) => {
      if (!n.meta) {
        assert(false, "Node was missing meta data");
        return;
      }
      assert(checkBetween.delete(n.meta), "Node was not an in between node");
    });

    assert.equal(checkBetween.size, 0, "Not all in between nodes were found");
  });

  test("Should gather nodes that have edges", async () => {
    const network = await makeNetworkComplex(1, 3, 3, 10);
    const entry = network.nodes[0];
    if (!entry) throw new Error("No entry found for test");

    const results = await spread({
      startNodes: entry,
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        result.nodes.forEach((n) => {
          assert(
            n.in.length > 0 || n.out.length > 0,
            "Node should have at least one edge"
          );
        });
      },
    });

    assert(results, "Results from the spread were never determined");

    results.nodes.forEach((n) => {
      if (!n.meta) {
        assert(false, "Node was missing meta data");
        return;
      }
    });
  });

  test("Should spread to all nodes regardless of start point", async () => {
    const rand = randomSeed.create("test");
    const list = makeLinkedList(25);
    let edges: TestEdge[] = list.edges.slice(0);
    let nodes: TestNode[] = list.nodes.slice(0);

    const flowers = new Array(25).fill(0).map(() => {
      const flower = makeFlower(100);
      edges = edges.concat(flower.edges);
      nodes = nodes.concat(flower.nodes);
      return flower;
    });

    for (let i = 0, iMax = list.nodes.length; i < iMax; ++i) {
      const node = list.nodes[i];
      const flower = flowers[i];
      edges.push(genEdgeMeta(rand, node, flower.nodes[0]));
    }

    let allNodes = new Set<TestNode | undefined>(nodes);
    let allEdges = new Set<TestEdge | undefined>(edges);
    const deletedEdges = new Set<TestEdge | undefined>();
    const network = await makeTestNetwork(nodes, edges);

    await spread({
      startNodes: [network.nodes[0]],

      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        result.nodes.forEach((n) =>
          assert(allNodes.delete(n.meta), "Node was not in the network")
        );

        result.edges.forEach((e) => {
          assert(
            allEdges.delete(e.meta),
            deletedEdges.has(e.meta)
              ? "Visited an edge multiple times"
              : "Edge was not in the network"
          );
          deletedEdges.add(e.meta);
        });

        return void 0;
      },
    });

    assert.equal(allNodes.size, 0, "Not all nodes were found");
    assert.equal(allEdges.size, 0, "Not all edges were found");

    allNodes = new Set<TestNode | undefined>(nodes);
    allEdges = new Set<TestEdge | undefined>(edges);
    deletedEdges.clear();

    await spread({
      startNodes: [network.nodes[network.nodes.length - 1]],

      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        result.nodes.forEach((n) =>
          assert(allNodes.delete(n.meta), "Node was not in the network")
        );

        result.edges.forEach((e) => {
          assert(
            allEdges.delete(e.meta),
            deletedEdges.has(e.meta)
              ? "Visited an edge multiple times"
              : "Edge was not in the network"
          );
          deletedEdges.add(e.meta);
        });

        return void 0;
      },
    });

    assert.equal(allNodes.size, 0, "Not all nodes were found");
    assert.equal(allEdges.size, 0, "Not all edges were found");
  });

  test("Should have a single path depth provided", async () => {
    const rand = randomSeed.create("test");
    const list = makeLinkedList(25);
    let edges: TestEdge[] = list.edges.slice(0);
    let nodes: TestNode[] = list.nodes.slice(0);

    const flowers = new Array(25).fill(0).map(() => {
      const flower = makeFlower(100);
      edges = edges.concat(flower.edges);
      nodes = nodes.concat(flower.nodes);
      return flower;
    });

    for (let i = 0, iMax = list.nodes.length; i < iMax; ++i) {
      const node = list.nodes[i];
      const flower = flowers[i];
      edges.push(genEdgeMeta(rand, node, flower.nodes[0]));
    }

    const network = await makeTestNetwork(nodes, edges);

    await spread({
      startNodes: [network.nodes[0]],
      keepPreviousPath: true,

      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        state: ISpreadState<TestNode, TestEdge>
      ) => {
        // Ensure the path exists
        assert(result.path, `Path was not provided at depth ${state.depth}`);

        // First wave will not have a path as it's the start of the path
        if (state.depth > 0) {
          result.nodes.forEach((n) => {
            const check = result.util.getParent(result.path, n);
            assert(check, "Node should have a path entry");

            if (check) {
              assert(
                !result.util.getParent(result.path, check),
                "There should only be a single depth for the path"
              );

              assert(
                n.in.find((e) => e.out === check || e.in === check) ||
                  n.out.find((e) => e.out === check || e.in === check),
                "The node should be connected to the parent indicated"
              );
            }
          });
        } else {
          result.nodes.forEach((n) =>
            assert(!result.path?.get(n), "Node should not have a path entry")
          );
        }

        return void 0;
      },
    });
  });

  test("Should retain the complete path", async () => {
    const rand = randomSeed.create("test");
    const list = makeLinkedList(25);
    let edges: TestEdge[] = list.edges.slice(0);
    let nodes: TestNode[] = list.nodes.slice(0);

    const flowers = new Array(25).fill(0).map(() => {
      const flower = makeFlower(100);
      edges = edges.concat(flower.edges);
      nodes = nodes.concat(flower.nodes);
      return flower;
    });

    for (let i = 0, iMax = list.nodes.length; i < iMax; ++i) {
      const node = list.nodes[i];
      const flower = flowers[i];
      edges.push(genEdgeMeta(rand, node, flower.nodes[0]));
    }

    const network = await makeTestNetwork(nodes, edges);
    const failures: string[] = [];

    await spread({
      startNodes: [network.nodes[0]],
      keepPath: true,
      // This should get ignored
      keepPreviousPath: true,

      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        state: ISpreadState<TestNode, TestEdge>
      ) => {
        // Ensure the path exists
        assert(result.path, `Path was not provided at depth ${state.depth}`);

        // First wave will not have a path as it's the start of the path
        if (state.depth > 0) {
          result.nodes.forEach((n) => {
            let depthCheck = state.depth;
            let check = result.util.getParent(result.path, n);
            let preventLoop = 0;

            while (check && ++preventLoop < 1000) {
              check = result.util.getParent(result.path, check);
              depthCheck--;
            }

            if (depthCheck !== 0) {
              failures.push(
                `Node ${n.id} did not have a path of depth ${state.depth} with check ${depthCheck}`
              );
            }
            if (preventLoop >= 1000) {
              failures.push(
                `Node ${n.id} had an infinite loop at depth ${state.depth}`
              );
            }
          });
        } else {
          result.nodes.forEach((n) =>
            assert(!result.path?.get(n), "Node should not have a path entry")
          );
        }

        return void 0;
      },
    });

    if (failures.length > 0) {
      assert.fail(failures.join("\n"));
    }
  });

  test("Should not collide from two start sources", async () => {
    // No collision should occur as both wave fronts will terminate at different
    // depths and not attempt to visit the same node.
    const network = await makeNetworkLinkedList(4);

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[3]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        assert(!result.collisions?.size);
      },
    });
  });

  test("Should create a collision from two start points", async () => {
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const network = await makeNetworkLinkedList(3);
    let didCollide: INode<TestNode, TestEdge> | void = void 0;

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[2]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        didCollide = didCollide ?? result.collisions?.values().next().value;
      },
    });

    assert.equal(
      didCollide!?.id,
      network.nodes[1].id,
      "Should be a single collision at the middle node"
    );
  });

  test("Should create a parent with two nodes at collision site", async () => {
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const network = await makeNetworkLinkedList(3);
    let didCollide: INode<TestNode, TestEdge> | void = void 0;

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[2]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        didCollide = didCollide ?? result.collisions?.values().next().value;
        result.util.getParent(result.path, result.nodes[0], (parents) => {
          assert.equal(
            parents.length,
            2,
            "Should have two parent nodes in the path"
          );
          return parents[0];
        });
      },
    });

    assert.equal(
      didCollide!?.id,
      network.nodes[1].id,
      "Should be a single collision at the middle node"
    );
  });

  test("Should create a collision for many start points", async () => {
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const network = await makeNetworkFlower(101);
    let didCollide: INode<TestNode, TestEdge> | void = void 0;

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: network.nodes.slice(1),
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        didCollide = didCollide ?? result.collisions?.values().next().value;
        result.util.getParent(result.path, result.nodes[0], (parents) => {
          assert.equal(
            parents.length,
            100,
            "Should have two parent nodes in the path"
          );
          return parents[0];
        });
      },
    });

    assert.equal(
      didCollide!?.id,
      network.nodes[0].id,
      "Should be a single collision at the middle node"
    );
  });

  test("Should create a distant collision from the start nodes", async () => {
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const network = await makeNetworkLinkedList(101);
    let didCollide: INode<TestNode, TestEdge> | void = void 0;

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[100]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        didCollide = didCollide ?? result.collisions?.values().next().value;

        if (didCollide) {
          result.util.getParent(result.path, result.nodes[0], (parents) => {
            assert.equal(
              parents.length,
              2,
              "Should have two parent nodes in the path"
            );
            return parents[0];
          });
        }
      },
    });

    assert.equal(
      didCollide!?.id,
      network.nodes[50].id,
      "Should be a single collision at the middle node"
    );
  });

  test("Should create many distant collisions from the start nodes", async () => {
    const rand = randomSeed.create("test");
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const leftList = makeLinkedList(10);
    const rightList = makeLinkedList(10);
    const middleList = makeLinkedList(10);
    const edges = leftList.edges.concat(middleList.edges, rightList.edges);

    // Create edges from the left list end to all middle nodes. And edges from
    // the right list beginning to all middle nodes
    const leftNode = leftList.nodes[leftList.nodes.length - 1];
    const rightNode = rightList.nodes[0];

    for (let i = 0, iMax = middleList.nodes.length; i < iMax; ++i) {
      const node = middleList.nodes[i];
      edges.push(genEdgeMeta(rand, leftNode, node));
      edges.push(genEdgeMeta(rand, rightNode, node));
    }

    const network = await makeTestNetwork(
      leftList.nodes.concat(middleList.nodes, rightList.nodes),
      edges
    );

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[network.nodes.length - 1]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        if (result.collisions) {
          assert.equal(result.collisions.size, 10, "Should have 10 collisions");

          result.collisions.forEach((collision) => {
            result.util.getParent(result.path, collision, (parents) => {
              assert.equal(
                parents.length,
                2,
                "Each collision should have 2 parents each"
              );
              return parents[0];
            });
          });
        }
      },
    });
  });

  test("Should continue spreading after collision", async () => {
    const rand = randomSeed.create("test");
    // This should cause both wave fronts to visit the middle node at the same
    // depth. This should be considered a collision.
    const list = makeLinkedList(3);
    const trail = makeFlower(101);
    const network = await makeTestNetwork(
      list.nodes.concat(trail.nodes),
      list.edges
        .concat(trail.edges)
        .concat(genEdgeMeta(rand, list.nodes[1], trail.nodes[0]))
    );
    let didCollide: INode<TestNode, TestEdge> | void = void 0;
    let didFlower = false;

    // Spread from both ends so the wave fronts rush at each other.
    await spread({
      startNodes: [network.nodes[0], network.nodes[2]],
      results: async (
        result: ISpreadResult<TestNode, TestEdge>,
        _state: ISpreadState<TestNode, TestEdge>
      ) => {
        didCollide = didCollide ?? result.collisions?.values().next().value;

        if (result.nodes.length === 100) didFlower = true;

        if (didCollide) {
          result.util.getParent(result.path, result.nodes[0], (parents) => {
            assert.equal(
              parents.length,
              2,
              "Should have two parent nodes in the path"
            );
            return parents[0];
          });
        }
      },
    });

    assert.equal(
      didFlower,
      true,
      "Spread should process ends of the flower network"
    );

    assert.equal(
      didCollide!?.id,
      network.nodes[1].id,
      "Should be a single collision at the joining node"
    );
  });
});

if (process.env.SKIP_LONG_TESTS !== "true") {
  describe("spread with pauses", function () {
    test("Should spread with a non-blocking delay per wave", async () => {
      const network = await makeRandomNetwork(100, 10000, true);
      let count = 0;
      const start = Date.now();
      let check = true;

      const waitResult = spread({
        startNodes: [network.nodes[0]],
        results: async (
          _result: ISpreadResult<TestNode, TestEdge>,
          _state: ISpreadState<TestNode, TestEdge>
        ) => {
          count++;
          await new Promise((resolve) => setTimeout(resolve, 100));
          check = false;
          return { stop: false };
        },
      });

      assert(
        check,
        "Post start spread did not execute before spread operation"
      );
      await waitResult;
      assert(
        Date.now() - start > count * 100,
        `Did not wait long enough for ${count} waves. Should be more than ${
          count * 100
        }ms`
      );
    });
  });
}
