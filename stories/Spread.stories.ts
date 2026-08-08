import { spread } from "../src/selection/spread";
import { IEdge, INode } from "../src/types";

type Meta = { label: string };
type NData = INode<Meta, undefined>;
type EData = IEdge<Meta, undefined>;

function makeNode(id: number, label: string): NData {
  return { id, in: [], out: [], value: 0, meta: { label } };
}

function connect(a: NData, b: NData, id: number): EData {
  const edge: EData = { id, a, b, atob: 1, btoa: 1 };
  a.out.push(edge);
  b.in.push(edge);
  return edge;
}

/** A small hand-built network: one root branching into two chains that reconverge on a shared tail node. */
function makeDemoNetwork() {
  const root = makeNode(1, "root");
  const left1 = makeNode(2, "left-1");
  const left2 = makeNode(3, "left-2");
  const right1 = makeNode(4, "right-1");
  const tail = makeNode(5, "tail");

  connect(root, left1, 1);
  connect(left1, left2, 2);
  connect(root, right1, 3);
  connect(left2, tail, 4);
  connect(right1, tail, 5);

  return root;
}

export default {
  title: "selection/spread"
};

export const LayerByLayerTraversal = () => {
  const container = document.createElement("div");
  container.style.fontFamily = "monospace";
  container.style.whiteSpace = "pre";
  container.textContent = "Running spread()...\n";

  const root = makeDemoNetwork();
  let layerIndex = 0;

  spread<Meta, undefined>({
    startNodes: root,
    results: async data => {
      const nodeLabels = data.nodes.map(n => n.meta?.label ?? n.id).join(", ") || "(none)";
      const edgeIds = data.edges.map(e => e.id).join(", ") || "(none)";

      container.textContent +=
        `layer ${layerIndex}: nodes=[${nodeLabels}] edges=[${edgeIds}]\n`;
      layerIndex++;

      // Slow it down slightly so the layer-by-layer nature of spread() is visible rather than instant.
      await new Promise(r => setTimeout(r, 300));
      return {};
    }
  });

  return container;
};
