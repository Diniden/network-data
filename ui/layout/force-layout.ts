import * as d3Force from "d3-force";
import { isDefined, Vec2 } from "deltav";
import { addNode, removeNode } from "../data";
import { fragmentNetwork } from "../data/fragment-network";
import { ISpreadResult, spread } from "../selection";
import { branchThresholdNodes } from "../selection/branch-threshold-nodes";
import { disjointGroups } from "../selection/disjoint-groups";
import { gatherConnectedNodes } from "../selection/gather-connected-nodes";
import {
  Identifier,
  IEdge,
  INetworkData,
  INode,
  IParentNetworkData,
} from "../types";
import { aabbEncapsulatePoints } from "./math/aabb";
import { circleDistanceToPointSq, circleEncapsulateAABB } from "./math/circle";
import { ILayout, ILayoutResult } from "./types";

/**
 * Results provided by the force layout
 */
export interface IForceLayoutResult<TNodeMeta, TEdgeMeta>
  extends ILayoutResult<TNodeMeta, TEdgeMeta> {
  /** The force nodes created to describe the layout */
  nodes: IForce<INode<TNodeMeta, TEdgeMeta>>[];
  /** Helps resolve some queries easier by providing this lookup */
  nodeById: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>;
  /** The edges based on the force nodes created to describe the layout */
  edges: IResolvedLink<INode<TNodeMeta, TEdgeMeta>>[];
}

/**
 * Options provided to forceLayout to generate a force directed graph of the
 * nodes and edges provided.
 */
export interface IForceLayoutOptions<TNodeMeta, TEdgeMeta>
  extends ILayout<TNodeMeta, TEdgeMeta> {
  /** The center of the simulation x-axis */
  centerX: number;
  /** The center of the simulation y-axis */
  centerY: number;
  /**
   * The multiplier that affects how strong nodes push from each other. Nodes
   * naturally push away with a stronger force the larger the node is.
   */
  spreadBias: number;
  /**
   * Suggested (not guaranteed) padding around each node.
   */
  nodePadding?: number;
  /**
   * When provided this will exclude sub networks that have nodes less than the
   * provided value.
   */
  removeSmallNetworks?: number;
  /**
   * When provided this will exclude sub networks that have nodes greater than
   * the provided value.
   */
  removeLargeNetworks?: number;

  /**
   * This should be set when the input network is very large. This will cause
   * fragments of large comlicated networks to be simulated in smaller chunks.
   *
   * This can be more or less performant depending on the structure being broken
   * down.
   */
  fragmentNetwork?: {
    /**
     * How many nodes must be present in a network before it's considered for
     * fragmenting.
     */
    nodeThreshold: number;
    /**
     * Number of branches to trigger a network fragment from a node.
     */
    branchThreshold: number;
  };

  /**
   * When this is provided, this will automatically run the simulation for you
   * synchronously and will run a number of attempts to resolve collisions
   * between nodes.
   */
  autoResolve?: {
    /** Number of times to run the simulation */
    ticks: number;
    /**
     * Number of times to attempt to resolve collisions (collision resolutions)
     * can be costly in terms of performance and time.
     */
    resolveCollisions: number;
  };

  /** Calculate the radius of the node data using this callback parameter */
  getRadius(node: INode<TNodeMeta, TEdgeMeta>): number;
  /**
   * Provides all of the forces and links involved in the simulation. This is an
   * opportunity to initialize graphics or elements for representing each
   * element that will be present in the simulation.
   */
  onLayoutBegin?(
    result: IForceLayoutResult<TNodeMeta, TEdgeMeta>
  ): Promise<void>;
  /**
   * This is an opportunity to make each simulation tick pause. Each time the
   * returned Promise resolves, the simulation will tick. This is useful for
   * rendering the simulation as it progresses.
   */
  onLayoutUpdate?(
    result: IForceLayoutResult<TNodeMeta, TEdgeMeta>
  ): Promise<void>;
}

export interface IForce<TData> {
  /**
   * The index of this force indicating where in the list of nodes it is
   * located, as well as, ties this node to the indices specified in the links
   */
  index: number;
  /** The generated x position of the node */
  x: number;
  /** The generated y position of the node */
  y: number;
  /**
   * The effective radius of the node for giving dimension to the forces
   * and collisions
   */
  r: number;
  /** The fixed x position of the node to keep the node static */
  fx?: number;
  /** The fixed y position of the node to keep the node static */
  fy?: number;
  /** Set the initial velocity of the node */
  vx?: number;
  /** Set the initial velocity of the node */
  vy?: number;

  /** Associated data with the force */
  d: TData;
}

/**
 * Defines a link between nodes for d3
 */
interface ILink<TData> {
  /** Index of the source within the node list handed to d3 */
  source: number | IForce<TData>;
  /** Index of the target within the node list handed to d3 */
  target: number | IForce<TData>;
}

/**
 * Defines a link that has had it's source and target indices resolved to
 * point to the actual force objects.
 */
export interface IResolvedLink<TData> extends ILink<TData> {
  /** Index of the source within the node list handed to d3 */
  source: IForce<TData>;
  /** Index of the target within the node list handed to d3 */
  target: IForce<TData>;
}

/** A network of force nodes based on an INetworkData object */
type ForceNetwork<TNodeMeta, TEdgeMeta> = {
  forces: IForce<INode<TNodeMeta, TEdgeMeta>>[];
  forceNetworkSet: Set<IForce<INode<TNodeMeta, TEdgeMeta>>>;
  forceByNodeId: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>;
  links: IResolvedLink<INode<TNodeMeta, TEdgeMeta>>[];
};

/** A force network based on a IParentNetworkData object */
type ParentForceNetwork<TNodeMeta, TEdgeMeta> = ForceNetwork<
  INetworkData<TNodeMeta, TEdgeMeta>,
  IEdge<TNodeMeta, TEdgeMeta>[]
> & { networkPadding: number };

/**
 * Generates an initialized force with a slight bit of wiggle around a given
 * point which prevents initialization overlaps which causes d3 to freak out and
 * use it's own initialization positions for a force simulation.
 *
 * @param index  The index of this force as found in the list of forces to be
 *               handed to d3.
 * @param center Recommended to be the starting center of the parent node
 * @param spread Recommended to be the radius of a parent node
 * @param radius The radius the force will represent. This should be equal to
 *               the radius rendered for the circle.
 */
function createForce<TData>(
  index: number,
  center: Vec2,
  spread: number,
  radius: number,
  data: TData
): IForce<TData> {
  return {
    index,
    // Place all items around the previous center, but guarantee no overlap
    // between each other. We can do this by the property that no two positive
    // integer radians will ever overlap.
    x: center[0] + Math.sin(index) * spread,
    y: center[1] + Math.cos(index) * spread,
    vx: 0,
    vy: 0,
    // We calculate the radius of the object. The newly loaded in items can
    // potentially (but unlikely) have a larger volume than the current max
    // volume set, so to prevent errors from occurring we ensure the used metric
    // for the radius is less than the max volume provided
    r: radius,
    d: data,
  };
}

/**
 * This creates a simulation to run nodes and edges with forces.
 */
async function simulate<TData>(
  nodes: IForce<TData>[],
  links: ILink<TData>[],
  spreadBias: number = 1,
  nodePadding: number = 2,
  ticks: number = 0,
  onSimulationTick?: (results: {
    nodes: IForce<TData>[];
    edges: ILink<TData>[];
  }) => Promise<void>,
  linkBias: number = 1
) {
  let minR = Number.MAX_SAFE_INTEGER;
  let maxR = Number.MIN_SAFE_INTEGER;
  let minX = Number.MAX_SAFE_INTEGER;
  let maxX = Number.MIN_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;

  // Find the min and max bounds of our metrics to create better assumptions for
  // the simulation
  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];
    minR = Math.min(minR, node.r);
    maxR = Math.max(maxR, node.r);
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }

  const rangeR = maxR - minR;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Create our simulation using the Circle Shape's radius as the pushing force
  // factor for the layout. So more radius means more push
  const simulation = d3Force
    .forceSimulation<IForce<TData>>(nodes)
    .force(
      "charge",
      d3Force
        .forceManyBody()
        .strength((n: IForce<TData>) => -n.r * spreadBias * 2)
    )
    .force("center", d3Force.forceCenter(centerX, centerY))

    // This adds a collisions detection for the simulation allowing the simulation
    // to collide elements with each other. So we provide the radius with a buffer
    // zone (to help ensure that the resolution is well outside boundary situations)
    // and we allow the system to iterate the collision a couple of times when
    // there is a tight region with large amounts of collisions happening that causes
    // a resolution to create more collisions.
    // The constants picked are from several tests and have proven to be the most
    // reliable thus far.
    .force(
      "collide",
      d3Force
        .forceCollide()
        .radius(function (n: IForce<TData>) {
          return n.r + nodePadding;
        })
        .iterations(5)
    );

  if (links.length > 0 && linkBias > 0) {
    simulation.force(
      "link",
      d3Force
        .forceLink()
        .links(links)
        .distance((d) => {
          // Prevent NaN evaluation
          if (rangeR === 0) return 75 * spreadBias;

          const r = Math.max(
            (d.source as IForce<any>).r,
            (d.target as IForce<any>).r
          );

          const length =
            (1 - (r - minR) / rangeR) * (150 * spreadBias) + 75 * spreadBias;

          return length * linkBias;
        })
    );
  } else if (linkBias) {
    simulation.force("link", d3Force.forceLink().links(links));
  }

  // Make sure the simulation does not execute automatically so we can
  // manually tick the motion
  simulation.stop();
  // Perform the requested initial ticks
  let toTick = ticks;

  while (toTick-- > 0) {
    simulation.tick();
    await onSimulationTick?.({
      nodes,
      edges: links,
    });
  }

  return simulation;
}

/**
 * Runs simulation on the parent network of all the forces networks then applies
 * it's result to the individual force networks.
 */
async function simulateParentNetwork<TNodeMeta, TEdgeMeta>(
  options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>,
  parentNetwork: IParentNetworkData<TNodeMeta, TEdgeMeta>,
  forceByNodeId: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>
): Promise<IForceLayoutResult<TNodeMeta, TEdgeMeta>> {
  const parentForceNetwork = await createParentForceNetwork(
    parentNetwork,
    options,
    forceByNodeId
  );
  const parentForces = parentForceNetwork.forces;
  const links = parentForceNetwork.links;

  // Ensure our input values are sensical
  if (
    parentForces.find((n) => isNaN(n.x) || isNaN(n.y) || isNaN(n.r) || n.r <= 0)
  ) {
    console.error("NaN or invalid input values", parentForces);
  }

  const simulationSpread = await simulate(
    parentForces,
    links,
    1,
    parentForceNetwork.networkPadding,
    0,
    void 0,
    0
  );

  // Gather our outputs and metrics for running the simulation
  const ticks = options.autoResolve?.ticks ?? 20;
  // Make our expected output
  let out: IForceLayoutResult<TNodeMeta, TEdgeMeta> = {
    nodes: [],
    edges: [],
    nodeById: new Map(),
  };

  // This method runs the full update of translating each node by it's parent
  // force which gives us a result to return to the caller.
  const updateOutput = () => {
    out = {
      nodes: [],
      edges: [],
      nodeById: new Map(),
    };

    // Loop through the parent network and apply it's values to all of it's
    // children.
    parentForceNetwork.forces.forEach((parentForce) => {
      // Translate each node to the parent network's position
      parentForce.d.meta?.nodes.forEach((node) => {
        const force = forceByNodeId.get(node.id);

        if (force) {
          const newNode = {
            ...force,
            x: force.x + parentForce.x,
            y: force.y + parentForce.y,
            d: node,
          };
          out.nodes.push(newNode);
          out.nodeById.set(node.id, newNode);
        }
      });

      // Create new links that match the new forces
      parentForce.d.meta?.edges.forEach((edge) => {
        const source = out.nodeById.get(edge.in.id);
        if (!source) return;
        const target = out.nodeById.get(edge.out.id);
        if (!target) return;

        out.edges.push({
          source,
          target,
        });
      });
    });
  };

  // Run a light spread simulation to help clean up some space
  for (let i = 0, iMax = ticks; i < iMax; ++i) simulationSpread.tick();

  // After running the ticks of the simulation, return the end result of the
  // process so we have something to return to the caller.
  updateOutput();
  return out;
}

/**
 * Runs simulations for each sub network found in the graph.
 */
async function simulateNetworks<TNodeMeta, TEdgeMeta>(
  options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>,
  networks: ForceNetwork<TNodeMeta, TEdgeMeta>[],
  parentNetwork: IParentNetworkData<TNodeMeta, TEdgeMeta>,
  forceByNodeId: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>,
  culledLinks: { source: Identifier; target: Identifier }[]
) {
  const { spreadBias, nodePadding, onLayoutUpdate: onSimulationTick } = options;

  // Simulate each force network independently. This improves performance and
  // offers opportunities to spread the networks better.
  // First generate simulations for each network
  const simulations = await Promise.all(
    networks.map(async (network) => {
      const forces = network.forces;
      const links = network.links;

      // Ensure our input values are sensical
      if (
        forces.find((n) => isNaN(n.x) || isNaN(n.y) || isNaN(n.r) || n.r <= 0)
      ) {
        console.error("NaN or invalid input values", forces);
      }

      const simulation = await simulate(
        forces,
        links,
        spreadBias,
        nodePadding,
        0,
        void 0
      );

      return simulation;
    })
  );

  // Get how many ticks each network requires
  const ticks = networks.map((network) =>
    network.forces.length < 5
      ? Math.min(10, options.autoResolve?.ticks ?? 0)
      : options.autoResolve?.ticks ?? 0
  );
  // Our iterator for the while loop (using a while loop as they await
  // correctly)
  let i = 0;
  // We will loop for the max number of ticks available
  const iMax = ticks.reduce((a, b) => (a > b ? a : b), 0);
  // This will be the output results of the simulation
  let out: IForceLayoutResult<TNodeMeta, TEdgeMeta> = {
    nodes: [],
    edges: [],
    nodeById: new Map(),
  };

  // Now run all of the ticks for the total simulation
  while (i < iMax) {
    // Run a tick for the simulation if the simulation has some ticks left
    for (let k = 0, kMax = simulations.length; k < kMax; ++k) {
      const simulation = simulations[k];
      const tickCount = --ticks[k];
      if (tickCount > 0) simulation.tick();
    }

    // If we have multiple networks, we have to simulate them together via the
    // parent network
    if (networks.length > 1) {
      out = await simulateParentNetwork(options, parentNetwork, forceByNodeId);
      out.edges = out.edges.concat(
        culledLinks
          .map((l) => {
            const source = out.nodeById.get(l.source);
            const target = out.nodeById.get(l.target);
            if (!source || !target) return;
            return { source, target };
          })
          .filter(isDefined)
      );
    }

    // Otherwise, we just broadcast the results of the single network
    else {
      const nodeById = new Map();
      networks[0].forces.forEach((f) => nodeById.set(f.d.id, f));

      out = {
        nodes: networks[0].forces,
        edges: networks[0].links.concat(
          culledLinks
            .map((l) => {
              const source = nodeById.get(l.source);
              const target = nodeById.get(l.target);
              if (!source || !target) return;
              return { source, target };
            })
            .filter(isDefined)
        ),
        nodeById,
      };
    }

    await onSimulationTick?.(out);
    i++;
  }

  return out;
}

/**
 * Converts a network into forces and links.
 *
 * WARNING: This assumes the provided network is already stripped of disjoint
 * networks. Failure to at least perform a disjoint network operation before
 * this will cause the simulation to break;
 */
async function createForceNetwork<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>,
  forceByNodeId?: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>
): Promise<ForceNetwork<TNodeMeta, TEdgeMeta>> {
  const { centerX, centerY, spreadBias, getRadius } = options;

  forceByNodeId =
    forceByNodeId ||
    new Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>();
  const forceNetwork: IForce<INode<TNodeMeta, TEdgeMeta>>[] = [];
  const forceNetworkSet: Set<IForce<INode<TNodeMeta, TEdgeMeta>>> = new Set();
  const links: IResolvedLink<INode<TNodeMeta, TEdgeMeta>>[] = [];

  // Spread through the network and initialize each node relative to it's parent
  // such that the simulation will not have initialized collisions. This
  // strategy also tends to produce a more balanced layout.
  await spread({
    startNodes: [network.nodes[0]],
    keepPreviousPath: true,

    // Handle each wave of nodes discovered. Place each around the parent
    // discovered
    results: async (result: ISpreadResult<TNodeMeta, TEdgeMeta>) => {
      const {
        nodes,
        path,
        util: { getParent },
      } = result;
      const layoutCenter: Vec2 = [centerX, centerY];

      for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
        const node = nodes[i];
        if (forceByNodeId!.has(node.id)) continue;
        const parentForce = forceByNodeId!.get(getParent(path, node)?.id);
        let center = layoutCenter;
        if (parentForce) center = [parentForce.x, parentForce.y];
        const nodeRadius = getRadius(node);
        const force = createForce(
          forceNetwork.length,
          center,
          (parentForce?.r ?? 0) + nodeRadius * spreadBias,
          nodeRadius,
          node
        );

        forceByNodeId!.set(node.id, force);
        forceNetwork.push(force);
        forceNetworkSet.add(force);
      }

      return { stop: false };
    },
  });

  for (let i = 0, iMax = network.edges.length; i < iMax; ++i) {
    const edge = network.edges[i];
    links.push({
      source: forceByNodeId.get(edge.in.id)!,
      target: forceByNodeId.get(edge.out.id)!,
    });
  }

  return {
    forces: forceNetwork,
    forceNetworkSet,
    forceByNodeId,
    links,
  };
}

/**
 * This creates the parent force network. The forces to be created have to be
 * computed as the bounding circle of all the forces of the subnetwork.
 */
async function createParentForceNetwork<TNodeMeta, TEdgeMeta>(
  network: IParentNetworkData<TNodeMeta, TEdgeMeta>,
  _options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>,
  forceByNodeId: Map<Identifier | void, IForce<INode<TNodeMeta, TEdgeMeta>>>
): Promise<ParentForceNetwork<TNodeMeta, TEdgeMeta>> {
  const parentForceByNodeId = new Map<
    Identifier | void,
    IForce<
      INode<INetworkData<TNodeMeta, TEdgeMeta>, IEdge<TNodeMeta, TEdgeMeta>[]>
    >
  >();

  let maxForceRadius = 0;

  // Create our force nodes
  const forces = network.nodes.map((n, i) => {
    const network = n.meta!;
    // Make an AABB that encompases the nodes of the network
    const networkForces = network.nodes
      .map((n) => {
        const force = forceByNodeId.get(n.id);
        if (force) maxForceRadius = Math.max(maxForceRadius, force.r);
        return force;
      })
      .filter(isDefined);
    // Encapsulate the forces
    const aabb = aabbEncapsulatePoints(networkForces);
    // Give minimum bounds to the aabb
    aabb.x -= 5;
    aabb.y -= 5;
    aabb.width += 10;
    aabb.height += 10;
    // Encapsulate the aabb with a circle to get a good midpoint
    const circle = circleEncapsulateAABB(aabb);
    // Shrink the circle down to the radius of the furthest point from the
    // center
    const furthest = networkForces.reduce(
      (p, n) => {
        const d = circleDistanceToPointSq(circle, n);
        return d > p.d ? { d, f: n } : p;
      },
      { d: 0, f: networkForces[0] }
    );
    // Adjust the circle radius, but keep a minimum to prevent errors
    circle.r = Math.max(5, Math.sqrt(furthest.d));

    // Create our force based on the circle
    const force = createForce(i, [circle.x, circle.y], circle.r, circle.r, n);
    // Store the look up to the force by data object
    parentForceByNodeId.set(n.id, force);

    return force;
  });

  // Organize our forces into a more sensical initial structure. We want larger
  // forces in the middle and smaller toward the edges. But we also want to have
  // a decent spread to make the resolutions easier to handle

  // Create our links
  const links = network.edges.map((e) => ({
    source: parentForceByNodeId.get(e.in.id)!,
    target: parentForceByNodeId.get(e.out.id)!,
  }));

  return {
    forces,
    forceNetworkSet: new Set(forces),
    forceByNodeId: parentForceByNodeId,
    links,
    networkPadding: maxForceRadius,
  };
}

/**
 * This performs the actions that will split the network into appropriate sub
 * networks that will be easier to simulate.
 */
async function fragmentNetworkStrategy<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>
) {
  const {
    fragmentNetwork: fragmentNetworkOptions,
    removeLargeNetworks = Number.MAX_SAFE_INTEGER,
    removeSmallNetworks = 0,
  } = options;

  const outCulledEdges: Set<IEdge<TNodeMeta, TEdgeMeta>> = new Set();

  // If we have fragmentation configuration, then we perform special rules to
  // break down the networks into smaller subnetworks.
  if (fragmentNetworkOptions) {
    // First split the network into it's disjoint parts
    const disjointResults = await disjointGroups(network);
    const disjointNetworks = await fragmentNetwork(
      disjointResults.groups.filter(
        (n) => n.length > removeSmallNetworks && n.length < removeLargeNetworks
      ),
      disjointResults.groupSets.filter(
        (n) => n.size > removeSmallNetworks && n.size < removeLargeNetworks
      )
    );

    const networks: INetworkData<TNodeMeta, TEdgeMeta>[] = [];
    const parentNetwork: typeof disjointNetworks["fragmentsNetwork"] = {
      nodes: [],
      edges: [],
      edgeMap: new Map(),
      nodeMap: new Map(),
      inToOutMap: new Map(),
    };

    // We are making a parent network to all the fragmented networks we are
    // working with. This will keep track of how all of the networks interconnect.
    const addResult = addNode(
      parentNetwork,
      disjointNetworks.fragmentsNetwork.nodes
    );

    if (
      (addResult.nodeErrors?.size || 0) > 0 ||
      (addResult.edgeErrors?.size || 0) > 0
    ) {
      console.error("Did not add all disjoint networks to the parent network");
    }

    // Let's analyze the disjoint networks for too large networks and fragment
    // them as well using other fragmentation strategies.
    for (let i = 0, iMax = disjointNetworks.fragments.length; i < iMax; ++i) {
      const disjointNetwork = disjointNetworks.fragments[i];
      const disjointNetworkNode = disjointNetworks.fragmentsNetwork.nodes.find(
        (n) => n.meta === disjointNetwork
      );

      // Break the network using the branch threshold strategy
      if (disjointNetwork.nodes.length > fragmentNetworkOptions.nodeThreshold) {
        console.log({
          max: 0,
          min: fragmentNetworkOptions.branchThreshold,
        });

        const branchResults = await branchThresholdNodes(disjointNetwork, {
          min: 0,
          max: fragmentNetworkOptions.branchThreshold,
        });

        const groupedResults = await gatherConnectedNodes(
          disjointNetwork,
          branchResults
        );

        console.log("GROUPED THRESHOLDS", groupedResults);

        const fragmentResults = await fragmentNetwork(
          groupedResults.groups,
          groupedResults.groupSets
        );

        const { fragments, fragmentsNetwork, culledEdges } = fragmentResults;

        if (fragments.length !== fragmentsNetwork.nodes.length) {
          console.error(
            "Generated more fragments than fragments network nodes"
          );
        }

        // If we generate a single network, we don't need to make any changes to
        // the disjoint network we made.
        if (fragments.length > 1) {
          // Add the culled edges to the output
          culledEdges.forEach((edge) => outCulledEdges.add(edge));

          for (let k = 0, kMax = fragments.length; k < kMax; ++k) {
            const branchNetwork = fragments[k];
            networks.push(branchNetwork);
          }

          // Remove the disjoint node as it will be replaced with the newly made
          // fragments.
          if (disjointNetworkNode) {
            const result = removeNode(parentNetwork, disjointNetworkNode);

            if (!result.nodes.has(disjointNetworkNode)) {
              console.error("Failed to remove disjoint network node");
            }
          } else {
            console.error("Disjoint network node not found");
          }

          // Keep track of how the fragmented networks interconnect in the parent
          // Network
          const addFragmentsResult = addNode(
            parentNetwork,
            fragmentsNetwork.nodes
          );

          if (
            (addFragmentsResult.nodeErrors?.size || 0) > 0 ||
            (addFragmentsResult.edgeErrors?.size || 0) > 0
          ) {
            console.error("Failed to add all fragments network nodes", {
              parentNetwork,
              fragmentsNetwork,
              addFragmentsResult,
            });
          }
        }

        // Add the disjoint network as one of our networks successfully added
        // since the fragmentation didn't cause any new fragments.
        else {
          networks.push(disjointNetwork);
        }
      }

      // Didn't attempt any breaks on the disjoint network, so we just add it;
      // to our list of successfully made networks.
      else {
        networks.push(disjointNetwork);
      }
    }

    return {
      networks,
      parentNetwork,
      culledEdges: outCulledEdges,
    };
  }

  // Otherwise, just return the input network with a single node parent network
  else {
    // First split the network into it's disjoint parts
    const disjointResults = await disjointGroups(network);
    const { fragments, fragmentsNetwork } = await fragmentNetwork(
      disjointResults.groups.filter(
        (n) => n.length > removeSmallNetworks && n.length < removeLargeNetworks
      ),
      disjointResults.groupSets.filter(
        (n) => n.size > removeSmallNetworks && n.size < removeLargeNetworks
      )
    );

    return {
      networks: fragments,
      parentNetwork: fragmentsNetwork,
    };
  }
}

/**
 * This generates positions based on the force layout concept for the network.
 * This will generate all of the positional information and the simulation so
 * you can settle the simulation as needed.
 */
export async function forceLayout<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IForceLayoutOptions<TNodeMeta, TEdgeMeta>
): Promise<IForceLayoutResult<TNodeMeta, TEdgeMeta>> {
  const { onLayoutBegin: onSimulationBegin } = options;

  // First fragment the input network into appropriate sized networks
  const { networks, parentNetwork, culledEdges } =
    await fragmentNetworkStrategy(network, options);

  // Convert each network into a force network so it can be simulated. Keep
  // track of all forces associated with the node.
  const forceByNodeId = new Map<
    Identifier | void,
    IForce<INode<TNodeMeta, TEdgeMeta>>
  >();
  const forceNetworks = await Promise.all(
    networks.map(
      async (network) =>
        await createForceNetwork(network, options, forceByNodeId)
    )
  );

  // Map the culled edges to resolved links for broadcasting
  let culledLinks: { source: Identifier; target: Identifier }[] = Array.from(
    culledEdges!
  ).map((edge) => ({
    source: edge.in.id,
    target: edge.out.id,
  }));

  culledLinks = [];

  // Broadcast all elements that will be a part of the simulation so any
  // construction required to show each element can be performed.
  const firstResult = {
    nodes: forceNetworks.reduce(
      (p, n) => p.concat(n.forces),
      [] as IForce<INode<TNodeMeta, TEdgeMeta>>[]
    ),
    edges: forceNetworks
      .reduce(
        (p, n) => p.concat(n.links),
        [] as IResolvedLink<INode<TNodeMeta, TEdgeMeta>>[]
      )
      .concat(
        culledLinks.map((l) => ({
          source: forceByNodeId.get(l.source)!,
          target: forceByNodeId.get(l.target)!,
          culled: true,
        }))
      ),
    nodeById: forceByNodeId,
  };

  await onSimulationBegin?.(firstResult);

  // We will simulate each network as it's own simulation. If we only have one
  // network to simulate, then we will broadcast these results.
  return await simulateNetworks(
    options,
    forceNetworks,
    parentNetwork,
    forceByNodeId,
    culledLinks
  );
}
