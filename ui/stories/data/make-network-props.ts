import { action, makeObservable, observable } from "mobx";
import enron from "../../../datasets/email-Enron.json";
import { getColorOptions } from "../../../unit-test/data/colors";
import {
  genEdgeMeta,
  genNodeMeta,
} from "../../../unit-test/data/node-edge-base";
import {
  makeFlower,
  makeNetworkCircularList,
  makeNetworkComplex,
  makeNetworkFlower,
  makeNetworkLinkedList,
  makeRandomNetwork,
  makeTestNetwork,
} from "../../../unit-test/data/test-networks";
import { TestEdge, TestNode } from "../../../unit-test/data/types";
import { makeNetwork } from "../../data";
import { INetworkRender } from "../components/tests/network-render/network-render";
import * as randomSeed from "random-seed";
import { imageToPixels } from "../components/tests/network-render/image-to-pixels";

import Logo from "../assets/thumbs-up.png";

class Store implements INetworkRender {
  @observable.shallow store: INetworkRender["store"] = {
    network: void 0,
  };

  constructor() {
    makeObservable(this);
  }

  async makeEnronNetwork() {
    const rand = randomSeed.create("organic");
    const data = enron as [string, string][];
    const color = getColorOptions(37000);

    const dataNodes = function* gen() {
      for (const row of data) {
        yield Number(row[0]);
        yield Number(row[1]);
        row.sort();
      }
    };

    const network = await makeNetwork({
      aggregateResults: true,

      nodeData: dataNodes,
      nodeId: (d) => d,
      nodeMeta: (d) => genNodeMeta(rand, color[d]),

      edgeData: data,
      edgeId: (d) => `${d[0]}-${d[1]}`,
      edgeMeta: (d) => genEdgeMeta(rand, void 0, void 0, `${d[0]}-${d[1]}`),
      edgeIn: (d) => Number(d[0]),
      edgeOut: (d) => Number(d[1]),
    });

    return network;
  }

  twoNodes() {
    (async () => {
      const network = await makeRandomNetwork(2, 1, true);
      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  simpleNetwork() {
    (async () => {
      const network = await makeRandomNetwork(100, 200, true);
      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  flower() {
    (async () => {
      const network = await makeNetworkFlower(101);
      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  circle() {
    (async () => {
      const network = await makeNetworkCircularList(100);
      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  line() {
    (async () => {
      const network = await makeNetworkLinkedList(100);
      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  complex() {
    (async () => {
      const network = await makeNetworkComplex(1, 0, 10, 10);

      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  disconnected() {
    (async () => {
      let edges: TestEdge[] = [];
      let nodes: TestNode[] = [];

      new Array(25).fill(0).map(() => {
        const flower = makeFlower(50);
        edges = edges.concat(flower.edges);
        nodes = nodes.concat(flower.nodes);
        return flower;
      });

      const network = await makeTestNetwork(nodes, edges);

      action(() => {
        this.store.network = network;
      })();
    })();

    return this;
  }

  organic() {
    (async () => {
      const network = await this.makeEnronNetwork();
      console.log({ network });

      action(() => {
        this.store = { network };
      })();
    })();

    return this;
  }

  logo() {
    (async () => {
      console.log("logo");
      const rand = randomSeed.create("logo");
      const pixels = await imageToPixels(Logo);
      console.log({ pixels });

      // Convert each filled pixel to a node with color information that
      // connects to the neighboring nodes
      const nodes: TestNode[] = [];
      const edges: TestEdge[] = [];
      const coordToNode = new Map<number, Map<number, TestNode>>();

      for (let i = 0, iMax = pixels.length; i < iMax; ++i) {
        const row = pixels[i];

        for (let k = 0, kMax = row.length; k < kMax; ++k) {
          const pixel = row[k];

          if (pixel[3] > 0) {
            const node = {
              color: pixel,
              dateMetric: new Date(),
              name: `${i}-${k}`,
              numMetric: 0,
              strMetric: "",
              UID: `${i}-${k}`,
            };

            nodes.push(node);
            let nodeMap = coordToNode.get(i);

            if (!nodeMap) {
              nodeMap = new Map();
              coordToNode.set(i, nodeMap);
            }

            nodeMap.set(k, node);

            // Get the top and left neighbors. If they exist make edges to each
            const topNode = coordToNode.get(i - 1)?.get(k);
            const leftNode = coordToNode.get(i)?.get(k - 1);

            if (topNode) edges.push(genEdgeMeta(rand, node, topNode));
            if (leftNode) edges.push(genEdgeMeta(rand, node, leftNode));
          }
        }
      }

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

      console.log({ network });

      action(() => {
        this.store = { network };
      })();
    })();

    return this;
  }
}

export const MakeNetworkProps = () => new Store();
