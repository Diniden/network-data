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

      action(() => {
        this.store = { network };
      })();
    })();

    return this;
  }
}

export const MakeNetworkProps = () => new Store();
