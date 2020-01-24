import { INetworkData } from "../types";
import { cloneEdge } from "./clone-edge";
import { cloneNode } from "./clone-node";

/**
 * This deep clones a network object (except for meta data)
 */
export function cloneNetwork<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>
): INetworkData<TNodeMeta, TEdgeMeta> {
  const atobMap = new Map();
  const edgeMap = new Map();
  const nodeMap = new Map();

  const nodes = network.nodes.map((n, id) => {
    const node = cloneNode(n);
    nodeMap.set(id, node);

    return node;
  });

  const edges = network.edges.map((e, id) => {
    const edge = cloneEdge(e);
    edgeMap.set(id, edge);

    return edge;
  });

  network.atobMap.forEach((map, nodeA) => {
    const mapB = new Map();
    atobMap.set(nodeMap.get(nodeA.id), mapB);
    map.forEach((edge, nodeB) =>
      mapB.set(nodeMap.get(nodeB.id), edgeMap.get(edge.id))
    );
  });

  return {
    atobMap,
    edgeMap,
    nodeMap,
    nodes,
    edges
  };
}
