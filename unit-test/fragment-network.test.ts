import { describe, test } from "@jest/globals";
import assert from "assert";
import { NetworkData } from "../ui";
import { fragmentNetwork } from "../ui/data/fragment-network";
import { branchThresholdNodes } from "../ui/selection/branch-threshold-nodes";
import { disjointGroups } from "../ui/selection/disjoint-groups";
import { gatherConnectedNodes } from "../ui/selection/gather-connected-nodes";
import { MakeNetworkProps } from "../ui/stories/data/make-network-props";
import { makeNetworkComplex, makeNetworkFlower } from "./data/test-networks";

describe("fragment-network", () => {
  test("Should produce original network", async () => {
    const network = await makeNetworkFlower(101);
    const { fragments, fragmentsNetwork, errors } = await fragmentNetwork(
      [network.nodes],
      [new Set(network.nodes)]
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      fragments.length,
      1,
      "Should be a single fragment network output"
    );
    assert(
      !Boolean(
        network.nodes.forEach(
          (n) => !fragments.find((f) => f.nodes.includes(n))
        )
      ),
      "All nodes should be in the output network"
    );
    assert(
      !Boolean(fragments[0].nodes.forEach((n) => !network.nodes.includes(n))),
      "Should not be any extra nodes in the output network"
    );

    assert.equal(
      fragmentsNetwork.nodes.length,
      1,
      "The fragment network should only have one node"
    );

    assert.equal(
      fragmentsNetwork.edges.length,
      0,
      "The fragment network should have no edges"
    );
  });

  test("Should produce a network per each disjoint group", async () => {
    const network = await makeNetworkComplex(3, 3, 3, 10);
    const { groups, groupSets } = await disjointGroups(network);
    const { fragments, fragmentsNetwork, errors } = await fragmentNetwork(
      groups,
      groupSets
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      fragments.length,
      groups.length,
      "Should be as many fragments as groups"
    );
    assert.equal(
      fragmentsNetwork.nodes.length,
      groups.length,
      "The fragment network should have nodes for each group"
    );

    assert.equal(
      fragmentsNetwork.edges.length,
      0,
      "The fragment network should have no since all groups are disjoint"
    );
  });

  test("Should produce networks with sensical in and out edges", async () => {
    const network = await makeNetworkComplex(3, 3, 3, 10);
    const { groups, groupSets } = await disjointGroups(network);

    groups.forEach((group, i) => {
      if (group.length > 1) {
        group.forEach((node) => {
          assert(
            node.in.length > 0 || node.out.length > 0,
            `Disjoint networks internal nodes should all have at least one edge if greater than one node\n  {group: ${group.length}, node: ${node.id}}`
          );

          const checkRef =
            node.in.find(
              (e) => group.includes(e.in) && group.includes(e.out)
            ) ||
            node.out.find((e) => group.includes(e.in) && group.includes(e.out));

          assert(
            checkRef,
            "There must be at least one edge on the node that belongs to the group completely if group is larger than 1."
          );
        });
      }

      const groupSet = groupSets[i];
      group.forEach((n) =>
        assert(
          groupSet.has(n),
          "All nodes should be in the group set associated with it"
        )
      );
    });

    const { fragments, fragmentsNetwork, errors } = await fragmentNetwork(
      groups,
      groupSets
    );

    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");

    assert.equal(
      fragmentsNetwork.edges.length,
      0,
      "The fragments network should have no edges since all groups are disjoint"
    );

    fragments.forEach((network) => {
      assert.equal(
        network.nodes.length,
        network.nodeMap.size,
        "Node map should have the same number of nodes as the nodes array"
      );

      network.nodes.forEach((node) => {
        if (network.nodes.length > 1) {
          assert(
            node.in.length > 0 || node.out.length > 0,
            `Every node in a multi-node network should have at least one in or out edge\n  {node: ${node.id}, in: ${node.in.length}, out: ${node.out.length}, network: ${network.nodes.length}}`
          );
        }
      });
    });
  });

  test("Should produce a network whose edges and nodes share the same internal object references", async () => {
    const network = await makeNetworkComplex(3, 3, 3, 10);
    const {
      groups,
      groupSets,
      errors: groupErrors,
    } = await disjointGroups(network);
    const { fragments, fragmentsNetwork, errors } = await fragmentNetwork(
      groups,
      groupSets
    );

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

    assert.equal(groupErrors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
    assert.equal(
      fragments.length,
      groups.length,
      "Should be as many fragments as groups"
    );
    assert.equal(
      fragmentsNetwork.nodes.length,
      groups.length,
      "The fragment network should have nodes for each group"
    );

    assert.equal(
      fragmentsNetwork.edges.length,
      0,
      "The fragments network should have no edges since all groups are disjoint"
    );

    fragments.forEach((network) => {
      assert.equal(
        network.nodes.length,
        network.nodeMap.size,
        "Node map should have the same number of nodes as the nodes array"
      );

      network.nodes.forEach((node) => {
        assert(network.nodeMap.has(node.id), "Node should be in the node map");
        assert(
          network.nodeMap.get(node.id) === node,
          "Node in node map should be the same object as the node in the nodes array"
        );

        if (network.nodes.length > 1) {
          assert(
            node.in.length > 0 || node.out.length > 0,
            "Every node should have at least one in or out edge"
          );
        }

        node.in.forEach((edge) => {
          assert(
            network.edgeMap.has(edge.id),
            "Edge should be in the edge map"
          );
          assert(
            network.edgeMap.get(edge.id) === edge,
            "Edge in edge map should be the same object as the edge in the in array"
          );
          assert(
            network.edges.includes(edge),
            "Edge should be located in the edges array"
          );
        });

        node.out.forEach((edge) => {
          assert(
            network.edgeMap.has(edge.id),
            "Edge should be in the edge map"
          );
          assert(
            network.edgeMap.get(edge.id) === edge,
            "Edge in edge map should be the same object as the edge in the in array"
          );
          assert(
            network.edges.includes(edge),
            "Edge should be located in the edges array"
          );
        });
      });

      network.edges.forEach((edge) => {
        assert(
          network.nodes.includes(edge.in),
          `The edge node in should be in the network nodes \n  {node id: ${
            edge.in.id
          }, node id in lookup: ${network.nodeMap.has(edge.in.id)}}`
        );
        assert(
          network.nodes.includes(edge.out),
          `The edge node out should be in the network nodes \n  {node id: ${
            edge.out.id
          }, node id in lookup: ${network.nodeMap.has(edge.out.id)}}`
        );
      });
    });
  });
});

if (process.env.SKIP_LONG_TESTS !== "true") {
  describe("fragment-network", () => {
    test("Should pass all checks even for large natural network even with a complex fragmentation strategy", async () => {
      const network = await MakeNetworkProps().makeEnronNetwork();

      if (!network) {
        assert(network, "Network should have been created");
        return;
      }

      const {
        groups,
        groupSets,
        errors: groupErrors,
        disjoint,
      } = await gatherConnectedNodes(
        network,
        await branchThresholdNodes(network, {
          min: 300,
        })
      );

      NetworkData.Selection.disjointGroups;

      assert.equal(
        groupErrors?.length || 0,
        0,
        "Should be no errors discovered"
      );
      assert.equal(
        groups.reduce((a, b) => a + b.length, 0) +
          disjoint.groups.reduce((a, b) => a + b.length, 0),
        network.nodes.length,
        "Should be same number of nodes in groups as in network"
      );
      assert(
        groups.find((g) => g.length > 1),
        "There should be groups with more than one node"
      );
      groups.forEach((group) => {
        if (group.length > 1) {
          group.forEach((node) => {
            assert(
              node.in.length > 0 || node.out.length > 0,
              `Branched groups internal nodes should all have at least one edge if greater than one node\n  {group: ${group.length}, node: ${node.id}}`
            );

            assert(
              node.in.find(
                (edge) => group.includes(edge.in) && group.includes(edge.out)
              ) ||
                node.out.find(
                  (edge) => group.includes(edge.in) && group.includes(edge.out)
                ),
              `Node in group must have one edge that is contained in the group\n  {group: ${group.length}, node: {id: ${node.id}, in: ${node.in.length}, out: ${node.out.length}}}`
            );
          });
        }
      });

      const { fragments, fragmentsNetwork, errors } = await fragmentNetwork(
        groups.concat(disjoint.groups),
        groupSets.concat(disjoint.groupSets)
      );

      assert.equal(errors?.length || 0, 0, "Should be no errors discovered");
      assert.equal(
        fragments.length,
        groups.length + disjoint.groups.length,
        "Should be as many fragments as groups and disjoint groups"
      );
      assert.equal(
        fragmentsNetwork.nodes.length,
        groups.length + disjoint.groups.length,
        "The fragment network should have nodes for each group"
      );

      fragments.forEach((fragmentNetwork) => {
        assert.equal(
          fragmentNetwork.nodes.length,
          fragmentNetwork.nodeMap.size,
          "Node map should have the same number of nodes as the nodes array"
        );

        fragmentNetwork.nodes.forEach((node) => {
          assert(
            fragmentNetwork.nodeMap.has(node.id),
            "Node should be in the node map"
          );
          assert(
            fragmentNetwork.nodeMap.get(node.id) === node,
            "Node in node map should be the same object as the node in the nodes array"
          );

          if (fragmentNetwork.nodes.length > 1) {
            const original = network.nodeMap.get(node.id);
            assert(
              node.in.length > 0 || node.out.length > 0,
              `Every node should have at least one in or out edge.\n  {network size: ${fragmentNetwork.nodes.length}, node: ${node.id}, original node: { in: ${original?.in.length} out: ${original?.out.length}}}`
            );
          }

          node.in.forEach((edge) => {
            assert(
              fragmentNetwork.edgeMap.has(edge.id),
              "Edge should be in the edge map"
            );
            assert(
              fragmentNetwork.edgeMap.get(edge.id) === edge,
              "Edge in edge map should be the same object as the edge in the in array"
            );
            assert(
              fragmentNetwork.edges.includes(edge),
              "Edge should be located in the edges array"
            );
          });

          node.out.forEach((edge) => {
            assert(
              fragmentNetwork.edgeMap.has(edge.id),
              "Edge should be in the edge map"
            );
            assert(
              fragmentNetwork.edgeMap.get(edge.id) === edge,
              "Edge in edge map should be the same object as the edge in the in array"
            );
            assert(
              fragmentNetwork.edges.includes(edge),
              "Edge should be located in the edges array"
            );
          });
        });

        fragmentNetwork.edges.forEach((edge) => {
          assert(
            fragmentNetwork.nodes.includes(edge.in),
            `The edge node in should be in the network nodes \n  {node id: ${
              edge.in.id
            }, node id in lookup: ${fragmentNetwork.nodeMap.has(edge.in.id)}}`
          );
          assert(
            fragmentNetwork.nodes.includes(edge.out),
            `The edge node out should be in the network nodes \n  {node id: ${
              edge.out.id
            }, node id in lookup: ${fragmentNetwork.nodeMap.has(edge.out.id)}}`
          );
        });
      });
    });
  });
}
