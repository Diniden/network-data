import { describe, test } from "@jest/globals";
import assert from "assert";
import { branchThresholdNodes } from "../ui/selection/branch-threshold-nodes";
import { gatherConnectedNodes } from "../ui/selection/gather-connected-nodes";
import {
  makeFlower,
  makeNetworkComplex,
  makeNetworkFlower,
  makeRandomNetwork,
  makeTestNetwork,
} from "./data/test-networks";

describe("branch-threshold-groups", () => {
  describe("High threshold should be equal to disjoint-groups", () => {
    test("Should be all nodes in the input network in the disjoint groups", async () => {
      const network = await makeNetworkFlower(101);
      const { groups, groupSets, errors, roots, disjoint } =
        await gatherConnectedNodes(
          network,
          await branchThresholdNodes(network, {
            min: 9999,
          })
        );

      assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
      assert.equal(roots.size, 0, "Should be no root nodes");
      assert.equal(groups.length, 0, "Should be no groups discovered");
      assert.equal(groupSets.length, 0, "Should be no groupSets discovered");
      assert.equal(disjoint.groups.length, 1, "Should be 1 disjoint group");
      assert.equal(
        disjoint.groupSets.length,
        1,
        "Should be 1 disjoint group set"
      );
      assert.equal(
        disjoint.groups[0].length,
        network.nodes.length,
        "Disjoint group should contain all nodes"
      );
      assert.equal(
        roots.size,
        groups.length,
        "Should be a root node per each group (both should be zero here)"
      );
      assert(
        !network.nodes.find(
          (n) => !(groups[0]?.includes(n) || disjoint.groups[0].includes(n))
        ),
        "All nodes should be in the output group or disjoint group"
      );
      assert(
        !network.nodes.find(
          (n) => !(groupSets[0]?.has(n) || disjoint.groupSets[0].has(n))
        ),
        "All nodes should be in the output group set or disjoint group set"
      );
    });

    test("Should produce two disjoint groups", async () => {
      const a = makeFlower(101);
      const b = makeFlower(101);
      const network = await makeTestNetwork(
        a.nodes.concat(b.nodes),
        a.edges.concat(b.edges)
      );
      const { errors, roots, disjoint } = await gatherConnectedNodes(
        network,
        await branchThresholdNodes(network, {
          min: 9999,
        })
      );

      assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
      assert.equal(roots.size, 0, "Should be no roots");
      assert.equal(
        disjoint.groups.length,
        2,
        "Should be 2 disjoint groups, one for each flower"
      );
      assert.equal(
        disjoint.groupSets.length,
        2,
        "Should be 2 disjoint group sets, one for each flower"
      );
      assert(
        !network.nodes.find(
          (n) =>
            !disjoint.groups[0].includes(n) && !disjoint.groups[1].includes(n)
        ),
        "All nodes should be in one of the disjoint groups"
      );
      assert(
        !network.nodes.find(
          (n) => !disjoint.groupSets[0].has(n) && !disjoint.groupSets[1].has(n)
        ),
        "All nodes should be in one of disjoint group sets"
      );
    });

    test("Should produce groups for all disconnected nodes", async () => {
      const network = await makeRandomNetwork(100, 0);
      const { errors, roots, disjoint } = await gatherConnectedNodes(
        network,
        await branchThresholdNodes(network, {
          min: 9999,
        })
      );

      assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
      assert.equal(roots.size, 0, "Should be no roots discovered");
      assert.equal(
        disjoint.groups.length,
        100,
        "Should be 100 disjoint groups, one for each node"
      );
      assert(
        !network.nodes.find((n) => !disjoint.groups.find((g) => g.includes(n))),
        "All nodes should be in one of the disjoint groups"
      );
      assert(
        !network.nodes.find((n) => !disjoint.groupSets.find((g) => g.has(n))),
        "All nodes should be in one of disjoint group sets"
      );
    });

    test("Should produce groups even for complex networks", async () => {
      const groupCount = 3;
      const looseNodes = 50;
      const network = await makeNetworkComplex(groupCount, looseNodes);
      const { errors, roots, disjoint } = await gatherConnectedNodes(
        network,
        await branchThresholdNodes(network, {
          min: 9999,
        })
      );

      assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
      assert.equal(roots.size, 0, "Should be no root nodes");
      assert.equal(
        disjoint.groups.length,
        groupCount + looseNodes,
        "Should be disjoint groups for everything disjoint"
      );
      assert(
        !network.nodes.find((n) => !disjoint.groups.find((g) => g.includes(n))),
        "All nodes should be in one of the disjoint groups"
      );
      assert(
        !network.nodes.find((n) => !disjoint.groupSets.find((g) => g.has(n))),
        "All nodes should be in one of disjoint group sets"
      );
    });
  });

  test("Should create groups at 10 or higher branches from a node from a fairly simple network", async () => {
    const groupCount = 1;
    const looseNodes = 0;
    const flowerCount = 10;
    const network = await makeNetworkComplex(
      groupCount,
      looseNodes,
      flowerCount,
      15
    );
    const { groups, groupSets, errors, roots } = await gatherConnectedNodes(
      network,
      await branchThresholdNodes(network, {
        min: 10,
      })
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(roots.size, 10, "Should be 10 roots");
    assert.equal(
      roots.size,
      groups.length,
      `Should be a root node per each group: {roots: ${roots.size}, groups: ${groups.length}}}`
    );
    assert.equal(
      groups.reduce((a, b) => a + b.length, 0),
      network.nodes.length,
      "Should be same number of nodes as input network"
    );
    assert.equal(
      groups.length,
      groupCount * flowerCount + looseNodes,
      "Should be a group per each flower"
    );
    assert.equal(
      groupSets.length,
      groupCount * flowerCount + looseNodes,
      "Should be group set per flower"
    );
    assert(
      !network.nodes.find((n) => !groups.find((g) => g.includes(n))),
      "All nodes should be in the output groups"
    );
    assert(
      !network.nodes.find((n) => !groupSets.find((g) => g.has(n))),
      "All nodes should be in the output group sets"
    );
  });

  test("Should create groups at 10 or higher branches from a node from a complex network", async () => {
    const groupCount = 10;
    const looseNodes = 50;
    const flowerCount = 15;
    const network = await makeNetworkComplex(
      groupCount,
      looseNodes,
      flowerCount,
      15
    );
    const { groups, groupSets, errors, roots, disjoint } =
      await gatherConnectedNodes(
        network,
        await branchThresholdNodes(network, {
          min: 10,
        })
      );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      roots.size,
      groups.length,
      "Should be a root node per each group"
    );
    assert.equal(
      groups.reduce((a, b) => a + b.length, 0) +
        disjoint.groups.reduce((a, b) => a + b.length, 0),
      network.nodes.length,
      "Should be same number of nodes as input network"
    );
    assert.equal(
      groups.length,
      groupCount * flowerCount,
      "Should be a group per each flower and group count"
    );
    assert.equal(
      groupSets.length,
      groupCount * flowerCount,
      "Should be group set per flower"
    );
    assert(
      !network.nodes.find(
        (n) =>
          !(
            groups.find((g) => g.includes(n)) ||
            disjoint.groups.find((g) => g.includes(n))
          )
      ),
      "All nodes should be in the output groups and disjoint groups"
    );
    assert(
      !network.nodes.find(
        (n) =>
          !(
            groupSets.find((g) => g.has(n)) ||
            disjoint.groupSets.find((g) => g.has(n))
          )
      ),
      "All nodes should be in the output group sets and disjoint groups"
    );
  });

  test("Should create groups at 10 or higher branches at nodes at exactly 10 branches", async () => {
    const groupCount = 1;
    const looseNodes = 0;
    const flowerCount = 10;
    const network = await makeNetworkComplex(
      groupCount,
      looseNodes,
      flowerCount,
      10
    );
    const { groups, groupSets, errors, roots } = await gatherConnectedNodes(
      network,
      await branchThresholdNodes(network, {
        min: 10,
      })
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      roots.size,
      groups.length,
      "Should be a root node per each group"
    );
    assert.equal(
      groups.length,
      groupCount * flowerCount + looseNodes,
      "Should be a group per each flower"
    );
    assert.equal(
      groupSets.length,
      groupCount * flowerCount + looseNodes,
      "Should be group set per flower"
    );
    assert(
      !network.nodes.find((n) => !groups.find((g) => g.includes(n))),
      "All nodes should be in the output groups"
    );
    assert(
      !network.nodes.find((n) => !groupSets.find((g) => g.has(n))),
      "All nodes should be in the output group sets"
    );
  });

  test("Should fail to create branch groups when set to 11 and highest is 10", async () => {
    const groupCount = 1;
    const looseNodes = 0;
    const flowerCount = 10;
    const network = await makeNetworkComplex(
      groupCount,
      looseNodes,
      flowerCount,
      10
    );
    const { errors, roots, disjoint } = await gatherConnectedNodes(
      network,
      await branchThresholdNodes(network, {
        min: 300,
      })
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(roots.size, 0, "Should be no roots");
    assert.equal(
      disjoint.groups.reduce((a, b) => a + b.length, 0),
      network.nodes.length,
      "Should be same number of disjoint nodes as input network"
    );
    assert.equal(
      disjoint.groups.length,
      1,
      "Should be a single disjoint group"
    );
    assert.equal(
      disjoint.groupSets.length,
      1,
      "Should be a single disjoint group set"
    );
    assert(
      !network.nodes.find((n) => !disjoint.groups.find((g) => g.includes(n))),
      "All nodes should be in the disjoint groups"
    );
    assert(
      !network.nodes.find((n) => !disjoint.groupSets.find((g) => g.has(n))),
      "All nodes should be in the disjoint group sets"
    );
  });
});
