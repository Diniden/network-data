import { describe, test } from "@jest/globals";
import { makeNetwork } from "../ui";
import { networkToJSString } from "../ui/util/network-to-js-string";
import { genEdgesMeta, genNodesMeta } from "./data/node-edge-base";

describe("network-to-js-string", function () {
  test("Should convert a network object", async () => {
    const nodes = genNodesMeta(100);
    const edges = genEdgesMeta(nodes, 1000);

    networkToJSString(
      await makeNetwork({
        nodeData: nodes,
        nodeId: (d) => d.UID,
        nodeMeta: (d) => d,

        edgeData: edges,
        edgeId: (d) => d.UID,
        edgeMeta: (d) => d,
        edgeIn: (d) => d.UID_IN,
        edgeOut: (d) => d.UID_OUT,
      })
    );
  });
});
