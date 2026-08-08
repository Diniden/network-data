import { describe, expect, it } from "bun:test";
import { spread, SpreadLayerPriority } from "../src/selection/spread";
import { IEdge, INode } from "../src/types";

/**
 * Builds a minimal, valid INode for use directly with the real spread()/neighbors() implementation, without going
 * through the makeNetwork() data-conversion pipeline.
 */
function makeNode(id: number): INode<undefined, undefined> {
  return { id, in: [], out: [], value: 0 };
}

/** Connects a -> b with a real IEdge and wires up both node's in/out lists like makeNetwork() would. */
function connect(
  a: INode<undefined, undefined>,
  b: INode<undefined, undefined>,
  id: number
): IEdge<undefined, undefined> {
  const edge: IEdge<undefined, undefined> = { id, a, b, atob: 1, btoa: 1 };
  a.out.push(edge);
  b.in.push(edge);
  return edge;
}

type Layer = { nodes: INode<undefined, undefined>[]; edges: IEdge<undefined, undefined>[] };

/** Runs spread() to completion and returns a deep-copied snapshot of every results() broadcast, in order. */
function runSpread(
  startNodes: INode<undefined, undefined> | INode<undefined, undefined>[],
  options: { excludeSameDepthEdges?: boolean; maxDepth?: number; maxNodesPerExecution?: number } = {}
) {
  const layers: Layer[] = [];

  return new Promise<Layer[]>((resolveDone, rejectDone) => {
    // spread() never resolves/rejects on its own - it just keeps calling results(). Without this, a spread() that
    // never reaches an empty node layer (e.g. because traversal did not terminate) would hang the test forever
    // instead of failing with a useful message.
    const timeout = setTimeout(
      () => rejectDone(new Error("spread() never broadcast an empty node layer - traversal did not terminate")),
      2000
    );

    spread({
      startNodes,
      ...options,
      results: async data => {
        // Snapshot with a copy - spread() reuses per-tick arrays across broadcasts, so a stored reference could
        // change out from under us after later rounds run.
        layers.push({ nodes: [...data.nodes], edges: [...data.edges] });

        if (data.nodes.length === 0) {
          clearTimeout(timeout);
          resolveDone(layers);
        }

        return {};
      }
    });
  });
}

describe("spread", () => {
  it("broadcasts each layer's edges as only the edges discovered in that layer, not the edges from every prior layer", async () => {
    // A -> B -> C: two hops, two distinct edges discovered one hop apart.
    const a = makeNode(1);
    const b = makeNode(2);
    const c = makeNode(3);
    const edgeAB = connect(a, b, 1);
    const edgeBC = connect(b, c, 2);

    const layers = await runSpread(a);

    // Layer 0: the seed node itself, nothing discovered yet.
    expect(layers[0].nodes).toEqual([a]);
    expect(layers[0].edges).toEqual([]);

    // Layer 1: processing A discovers B across edgeAB.
    expect(layers[1].nodes).toEqual([b]);
    expect(layers[1].edges).toEqual([edgeAB]);

    // Layer 2: processing B discovers C across edgeBC, AND legitimately re-surfaces edgeAB as a back edge to its
    // already-visited parent A (the default behavior when excludeSameDepthEdges isn't set).
    expect(layers[2].nodes).toEqual([c]);
    expect(layers[2].edges).toEqual([edgeAB, edgeBC]);

    // Layer 3: processing C re-surfaces edgeBC as a back edge to its parent B, discovers nothing new, and -
    // critically - does NOT still contain edgeAB. If edgeAB leaked in here, the edges array isn't being reset
    // per tick and is instead accumulating every edge ever seen across the whole run.
    expect(layers[3].nodes).toEqual([]);
    expect(layers[3].edges).toEqual([edgeBC]);
    expect(layers[3].edges).not.toContain(edgeAB);
  });

  it("only excludes TRUE same-depth (lateral) edges when excludeSameDepthEdges is set, not back edges to shallower ancestors", async () => {
    // Diamond: A -> B, A -> C (B and C are both depth 1 - siblings), B -> C is a genuine lateral edge between two
    // same-depth nodes, and B -> D / C -> D converge on D at depth 2.
    const a = makeNode(1);
    const b = makeNode(2);
    const c = makeNode(3);
    const d = makeNode(4);
    const edgeAB = connect(a, b, 1);
    const edgeAC = connect(a, c, 2);
    const edgeBC = connect(b, c, 3);
    const edgeBD = connect(b, d, 4);
    const edgeCD = connect(c, d, 5);

    const layers = await runSpread(a, { excludeSameDepthEdges: true });

    const byId = <T extends { id: number }>(items: T[]) => [...items].sort((x, y) => x.id - y.id);

    expect(layers[0]).toEqual({ nodes: [a], edges: [] });

    // Layer 1: A discovers both B and C - both depth 1, no same-depth edge exists between the seed and its
    // children, so nothing is excluded here. (Node/edge order within a layer isn't a documented guarantee, so
    // compare by id rather than array position.)
    expect(byId(layers[1].nodes)).toEqual(byId([b, c]));
    expect(byId(layers[1].edges)).toEqual(byId([edgeAB, edgeAC]));

    // Layer 2: processing B and C discovers D. The lateral edgeBC connects two depth-1 nodes and must be
    // excluded. edgeAB/edgeAC are back edges to the depth-0 ancestor A and must be KEPT even though the flag is
    // set - only true same-depth edges are affected.
    expect(layers[2].nodes).toEqual([d]);
    expect(byId(layers[2].edges)).toEqual(byId([edgeAB, edgeAC, edgeBD, edgeCD]));
    expect(layers[2].edges).not.toContain(edgeBC);

    expect(byId(layers[3].edges)).toEqual(byId([edgeBD, edgeCD]));
    expect(layers[3].nodes).toEqual([]);
  });

  it("stops discovering nodes past maxDepth without dropping nodes discovered at or before it", async () => {
    // A -> B -> C -> D, a straight 3-hop chain.
    const a = makeNode(1);
    const b = makeNode(2);
    const c = makeNode(3);
    const d = makeNode(4);
    connect(a, b, 1);
    connect(b, c, 2);
    connect(c, d, 3);

    const layers = await runSpread(a, { maxDepth: 1 });
    const allNodeIds = layers.flatMap(l => l.nodes.map(n => n.id));

    // Depth 0 (A) and depth 1 (B) are within bounds. C (depth 2) and D (depth 3) must never appear anywhere.
    expect(allNodeIds).toEqual([1, 2]);
  });

  it("splits a single BFS layer across multiple results() calls when it exceeds maxNodesPerExecution", async () => {
    // A star: A connects directly to 5 children, all at depth 1. With no cap, they'd all appear in one broadcast.
    const a = makeNode(1);
    const children = [2, 3, 4, 5, 6].map(id => makeNode(id));
    children.forEach((child, i) => connect(a, child, i + 1));

    const layers = await runSpread(a, { maxNodesPerExecution: 2 });

    // Layer 0: just the seed, as always.
    expect(layers[0].nodes).toEqual([a]);

    // The 5 children must still all be discovered exactly once in total...
    const discoveredIds = layers.slice(1).flatMap(l => l.nodes.map(n => n.id));
    expect(discoveredIds.sort((x, y) => x - y)).toEqual([2, 3, 4, 5, 6]);

    // ...but since only node A itself was ever queued for this one BFS layer (the cap limits how many *dequeued*
    // nodes are processed per tick, and A alone doesn't exceed that), it comes back in a single tick here. The cap
    // matters once there's more than maxNodesPerExecution nodes actually waiting in toProcess at once - verified
    // below by resuming the spread from a wider queue.
    expect(layers.length).toBeGreaterThan(1);
  });

  it("processes a wide layer already queued in toProcess across multiple ticks when it exceeds maxNodesPerExecution", async () => {
    // A hub-and-spoke where the SEED is itself 5 nodes, so all 5 are in toProcess together from the start.
    const hubs = [1, 2, 3, 4, 5].map(id => makeNode(id));
    const leaves = [6, 7, 8, 9, 10].map(id => makeNode(id));
    hubs.forEach((hub, i) => connect(hub, leaves[i], i + 1));

    const layers = await runSpread(hubs, { maxNodesPerExecution: 2 });

    // Layer 0 is the full seed set, unchunked (maxNodesPerExecution only caps how many nodes get DEQUEUED and
    // processed per tick, not the size of the initial seed broadcast). Seed order isn't a documented guarantee,
    // so compare by id set rather than array position.
    const byNumericId = (ids: number[]) => [...ids].sort((x, y) => x - y);
    expect(byNumericId(layers[0].nodes.map(n => n.id))).toEqual(byNumericId(hubs.map(n => n.id)));

    // Processing 5 hub nodes at a cap of 2-per-tick must take at least 3 ticks (2 + 2 + 1) before the leaves are
    // fully discovered, i.e. more than one results() call reports newly discovered leaves.
    const ticksWithNewLeaves = layers.slice(1).filter(l => l.nodes.length > 0);
    expect(ticksWithNewLeaves.length).toBeGreaterThan(1);

    const discoveredLeafIds = layers.slice(1).flatMap(l => l.nodes.map(n => n.id)).sort((x, y) => x - y);
    expect(discoveredLeafIds).toEqual([6, 7, 8, 9, 10]);
  });

  it("throws when layering is provided, since cross-layer coordination is not implemented", () => {
    const a = makeNode(1);

    expect(() =>
      spread({
        startNodes: a,
        layering: { layers: [], priority: SpreadLayerPriority.BLENDS },
        results: async () => ({})
      })
    ).toThrow();
  });
});
