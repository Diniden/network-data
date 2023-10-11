import { describe, test } from "@jest/globals";
import assert from "assert";
import { disjointGroups } from "../ui/selection/disjoint-groups";
import {
  makeFlower,
  makeNetworkComplex,
  makeNetworkFlower,
  makeRandomNetwork,
  makeTestNetwork,
} from "./data/test-networks";

describe("disjoint-groups", () => {
  test("Should be all nodes in the input network", async () => {
    const network = await makeNetworkFlower(101);
    const { groups, groupSets, errors } = await disjointGroups(network);

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      groups.length,
      1,
      "Should be 1 output group from one fully connected network"
    );
    assert.equal(
      groupSets.length,
      1,
      "Should be 1 output group set, one for each flower"
    );
    assert(
      !network.nodes.find((n) => !groups[0].includes(n)),
      "All nodes should be in the output group"
    );
    assert(
      !network.nodes.find((n) => !groupSets[0].has(n)),
      "All nodes should be in the output group set"
    );
  });

  test("Should produce two groups", async () => {
    const a = makeFlower(101);
    const b = makeFlower(101);
    const network = await makeTestNetwork(
      a.nodes.concat(b.nodes),
      a.edges.concat(b.edges)
    );
    const { groups, groupSets, errors } = await disjointGroups(network);

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      groups.length,
      2,
      "Should be 2 output groups, one for each flower"
    );
    assert.equal(
      groupSets.length,
      2,
      "Should be 2 output group sets, one for each flower"
    );
    assert(
      !network.nodes.find(
        (n) => !groups[0].includes(n) && !groups[1].includes(n)
      ),
      "All nodes should be in one of the output groups"
    );
    assert(
      !network.nodes.find((n) => !groupSets[0].has(n) && !groupSets[1].has(n)),
      "All nodes should be in one of output group sets"
    );
  });

  test("Should produce groups for all disconnected nodes", async () => {
    const network = await makeRandomNetwork(100, 0);
    const { groups, groupSets, errors } = await disjointGroups(network);

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      groups.length,
      100,
      "Should be 2 output groups, one for each flower"
    );
    assert(
      !network.nodes.find((n) => !groups.find((g) => g.includes(n))),
      "All nodes should be in one of the output groups"
    );
    assert(
      !network.nodes.find((n) => !groupSets.find((g) => g.has(n))),
      "All nodes should be in one of output group sets"
    );
  });

  test("Should produce groups even for complex networks", async () => {
    const groupCount = 3;
    const looseNodes = 50;
    const network = await makeNetworkComplex(groupCount, looseNodes);
    const { groups, groupSets, errors } = await disjointGroups(network);

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      groups.length,
      groupCount + looseNodes,
      "Should be groups for everything disjoint"
    );
    assert(
      !network.nodes.find((n) => !groups.find((g) => g.includes(n))),
      "All nodes should be in one of the output groups"
    );
    assert(
      !network.nodes.find((n) => !groupSets.find((g) => g.has(n))),
      "All nodes should be in one of output group sets"
    );
  });

  test("Should produce node groups where all nodes in networks of 2 or more have edges", async () => {
    const network = await makeNetworkComplex(3, 3, 3, 10);
    const { groups } = await disjointGroups(network);

    groups.forEach((group) => {
      if (group.length > 1) {
        group.forEach((node) => {
          assert(
            node.in.length > 0 || node.out.length > 0,
            `Disjoint networks internal nodes should all have at least one edge if greater than one node\n  {group: ${group.length}, node: ${node.id}}`
          );
        });
      }
    });
  });
});
