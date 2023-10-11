import {
  AutoEasingMethod,
  Bounds,
  CircleInstance,
  copy4,
  EdgeInstance,
  nextFrame,
  scale2,
  scale3,
  stopAnimationLoop,
  Vec2,
} from "deltav";
import { observer } from "mobx-react";
import * as React from "react";
import {
  addToMapOfMaps,
  disjointGroups,
  getFromMapOfMaps,
  Identifier,
  INetworkData,
} from "../../../..";
import { TestEdge, TestNode } from "../../../../../unit-test/data/types";
import { classnames } from "../../../../../util/classnames";
import { ILayoutResult } from "../../../../layout";
import { IForceLayoutResult } from "../../../../layout/force-layout";
import { gridGameLayout } from "../../../../layout/grid-game-layout";
import { IAABB } from "../../../../layout/math/aabb";
import "./network-render.scss";
import { Surface } from "./surface";

/** Rendering modes of this component */
export const NetworkRenderMode = {
  FORCE_GRAPH: "NetworkRender--force-graph",
} as const;

export type NetworkRenderModeType =
  (typeof NetworkRenderMode)[keyof typeof NetworkRenderMode];

/**
 * NetworkRender props
 */
export interface INetworkRender {
  /** Provides a custom class name to the container of this component */
  className?: string;
  /** Props to apply directly to the container div of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
  /** Rendering mode of this component */
  mode?: NetworkRenderModeType;

  /** Reactive properties */
  store: {
    /** The network we wish to visualize */
    network?: INetworkData<TestNode, TestEdge>;
  };
}

interface IState {}

/**
 * A WebGL renderer for rendering a network of data with nodes and edges.
 */
@observer
export class NetworkRender extends React.Component<INetworkRender, IState> {
  state: IState = {};
  container = React.createRef<HTMLDivElement>();
  surface?: Surface;
  loopId?: Promise<number>;
  unpause?: () => void;
  pause?: Promise<void> = new Promise((resolve) => (this.unpause = resolve));
  quit: boolean = false;
  renderFrames = 1;
  edges: EdgeInstance[] = [];
  nodes: CircleInstance[] = [];
  nodeToEdges = new Map<CircleInstance, EdgeInstance[]>();
  showEdges = false;

  triggers = {
    spread: 0,
    compress: 0,
    gather: false,
  };

  async componentDidMount() {
    document.addEventListener("keydown", this.handleKeydown);
    document.addEventListener("keyup", this.handleKeyup);
    await this.init();
  }

  async componentDidUpdate(prevProps: INetworkRender) {
    if (prevProps.mode !== this.props.mode) {
      this.destroy();
      await this.init();
    }

    if (prevProps.store.network !== this.props.store.network) {
      this.destroy();
      await this.init();
    }
  }

  handleKeydown = (e: KeyboardEvent) => {
    const oneFrame = () => {
      this.renderFrames = 1;
      this.unpause?.();
      this.unpause = void 0;
      console.log("PAUSING");
      this.pause = new Promise((resolve) => {
        this.unpause = resolve;
      });
    };

    // When space down pause the animation
    if (e.code === "Space") {
      if (this.unpause) {
        this.unpause();
        this.unpause = void 0;

        // Ensure edges are hidden when unpaused
        const surface = this.surface;
        if (!surface) return;
        this.edges.forEach((e) => surface.providers.edges.remove(e));
        this.showEdges = false;
      } else {
        console.log("PAUSING");
        this.pause = new Promise((resolve) => {
          this.unpause = resolve;
        });
      }
    }

    // Right arrow, step one frame forward
    if (e.code === "ArrowRight") {
      if (this.unpause) {
        oneFrame();
      } else {
        this.renderFrames = 500;
      }
    }

    // Up arrow
    if (e.code === "ArrowUp") {
      // If we're paused, this will cause a spread trigger to happen and move
      // the simulation by one step.
      if (this.unpause) {
        this.triggers.spread++;
        oneFrame();
      }
    }

    // Down arrow
    if (e.code === "ArrowDown") {
      // If we're paused, this will cause a compress trigger to happen and move
      // the simulation by one step.
      if (this.unpause) {
        this.triggers.compress++;
        oneFrame();
      }
    }

    // Letter E.
    if (e.code === "KeyE") {
      // When paused, allow the user to show the edges on the screen
      if (this.unpause) {
        const surface = this.surface;
        if (!surface) return;

        console.log(
          surface.ui.cameras.main.position,
          surface.ui.cameras.main.offset,
          surface.ui.cameras.main.scale2D
        );

        if (!this.showEdges) {
          this.edges.forEach((e) => surface.providers.edges.add(e));
          this.showEdges = true;
          oneFrame();
        } else {
          this.edges.forEach((e) => surface.providers.edges.remove(e));
          this.showEdges = false;
        }
      }
    }

    // Letter R
    if (e.code === "KeyR") {
      // When paused, this will only reveal the edges for the nodes currently in
      // the viewport.
      if (this.unpause) {
        const surface = this.surface;
        if (!surface) return;

        const view = new Bounds<{}>(
          surface.ui.eventManagers.main.getRange("Aworld.perspective")
        );

        for (let i = 0, iMax = this.nodes.length; i < iMax; ++i) {
          const node = this.nodes[i];

          if (view.containsPoint(node.center)) {
            const edges = this.nodeToEdges.get(node);
            if (!edges) continue;
            edges.forEach((e) => surface.providers.edges.add(e));
          }
        }

        this.showEdges = true;
        oneFrame();
      }
    }

    // Letter G
    if (e.code === "KeyG") {
      this.triggers.gather = true;
    }
  };

  handleKeyup = (e: KeyboardEvent) => {
    // Letter G
    if (e.code === "KeyG") {
      this.triggers.gather = false;
    }
  };

  componentWillUnmount() {
    this.destroy();
    this.quit = true;
    this.edges = [];
    document.removeEventListener("keydown", this.handleKeydown);
  }

  init = async () => {
    const network = this.props.store.network;
    if (!network) return;
    if (!this.container.current) return;
    const surface = (this.surface = new Surface(this.container.current));
    await surface.ui.ready;
    if (!surface.ui) return;

    const box = this.container.current.getBoundingClientRect();
    const circleByNodeId = new Map<Identifier, CircleInstance>();
    const edgeByInOut = new Map<Identifier, Map<Identifier, EdgeInstance>>();
    this.edges = [];
    let gatherTrigger = 0;

    /** Create all graphics objects */
    const initGraphics = async (
      results: IForceLayoutResult<TestNode, TestEdge>
    ) => {
      results.nodes.forEach((n) => {
        const circle = surface.providers.nodes.add(
          new CircleInstance({
            center: [n.x, n.y],
            radius: n.r,
            color: n.d.meta?.color || [1, 1, 1, 1],
          })
        );

        circleByNodeId.set(n.d.id, circle);
        this.nodes.push(circle);
      });

      const clean = results.edges.filter((e) => e.source && e.target);

      if (clean.length !== results.edges.length) {
        console.error("INIT: Edges with undefined source or target found");
        console.error(
          "Clean:",
          results.edges,
          "Errored:",
          results.edges.filter((e) => !e.source || !e.target)
        );
      }

      console.log("ADDING EDGES");
      clean.forEach((e) => {
        const edge = new EdgeInstance({
          start: [e.source.x, e.source.y],
          end: [e.target.x, e.target.y],
          thickness: [e.source.r * 2, e.target.r * 2],
          startColor: copy4(e.source.d.meta?.color || [1, 1, 1, 1]),
          endColor: copy4(e.target.d.meta?.color || [1, 1, 1, 1]),
        });

        edge.startColor[3] = 0.05;
        edge.endColor[3] = 0.05;
        // surface.providers.edges.add(edge);
        addToMapOfMaps(edgeByInOut, e.source.d.id, e.target.d.id, edge);
        const circleSource = circleByNodeId.get(e.source.d.id)!;
        const circleTarget = circleByNodeId.get(e.target.d.id)!;

        let edges = this.nodeToEdges.get(circleSource);
        if (!edges) this.nodeToEdges.set(circleSource, (edges = []));
        edges.push(edge);

        edges = this.nodeToEdges.get(circleTarget);
        if (!edges) this.nodeToEdges.set(circleTarget, (edges = []));
        edges.push(edge);

        this.edges.push(edge);
      });
    };

    let frame = 0;
    let optimize = {
      nodeCount: 100000,
      nodeIndex: 0,
    };

    const t = Date.now();
    const d = await disjointGroups(network);
    console.log("DISJOINT GROUPS", Date.now() - t, d);

    /** Render loop of the graphic object updates */
    const updateGraphics = async (
      results: ILayoutResult<TestNode, TestEdge>,
      forceUpdate?: boolean
    ) => {
      frame++;
      if (this.triggers.gather) gatherTrigger++;
      if (frame % this.renderFrames !== 0 && !forceUpdate) return;
      this.renderFrames = 1;
      const { nodes, edges } = results;

      // Update nodes
      for (
        let i = optimize.nodeIndex,
          iMax = Math.min(
            nodes.length,
            optimize.nodeCount + optimize.nodeIndex
          );
        i < iMax;
        ++i
      ) {
        const node = nodes[i];
        const circle = circleByNodeId.get(node.d.id);
        if (!circle) continue;

        if (circle.center[0] !== node.x || circle.center[1] !== node.y) {
          circle.center = [node.x, node.y];
        }
      }

      optimize.nodeIndex += optimize.nodeCount;
      if (optimize.nodeIndex >= nodes.length) optimize.nodeIndex = 0;

      const clean = edges.filter((e) => e.source && e.target);

      if (clean.length !== edges.length) {
        console.error("UPDATE: Edges with undefined source or target found");
        console.error(
          "Clean:",
          results.edges,
          "Errored:",
          edges.filter((e) => !e.source || !e.target)
        );
      }

      const failures: any[] = [];

      // Update edges
      if (this.showEdges) {
        for (let i = 0, iMax = clean.length; i < iMax; ++i) {
          const link = clean[i];

          const edge = getFromMapOfMaps(
            edgeByInOut,
            link.source.d.id,
            link.target.d.id
          );

          if (!edge) {
            failures.push(link);
            continue;
          }

          edge.start = [link.source.x, link.source.y];
          edge.end = [link.target.x, link.target.y];
          if (forceUpdate) surface.providers.edges.add(edge);

          if ((link as any).culled) {
            edge.startColor = [1, 0, 0, 1];
            edge.endColor = [1, 0, 0, 1];
          }
        }
      }

      await nextFrame();
      await this.pause;
    };

    // Run our layout implementation
    const results = await gridGameLayout(network, {
      centerX: box.width / 2,
      centerY: box.height / 2,
      cellWidth: 5,
      cellHeight: 5,
      steps: -1,

      // Generate our graphics to render for each element
      onLayoutBegin: initGraphics,

      // Update each element each tick of the simulation to watch it animate
      // through the simulation. Simply comment this out to make the simulation
      // run it's complete course without animating.
      onLayoutUpdate: updateGraphics,

      // Trigger to stop the simulation abruptly
      quitTrigger: () => this.quit,

      // Handle spread triggering for the simulation
      spreadTrigger: () => {
        return {
          trigger: this.triggers.spread,
          spread: 2,
        };
      },

      // Handle compression triggering for the simulation
      compressTrigger: () => this.triggers.compress,

      // Handle gather triggering for the simulation
      gatherTrigger: () => gatherTrigger,

      // Handle spread events so we can position the camera to the same relative
      // location
      onSpread: (spread) => {
        // const surface = this.surface;
        // if (!surface) return;
        // const current = new Bounds<{}>(
        //   surface.ui.eventManagers.main.getRange("Aworld.perspective")
        // );
        // const mid = current.mid;
        // mid[0] *= spread;
        // mid[1] *= spread;
        // surface.ui.cameras.main.control2D.animation =
        //   AutoEasingMethod.easeInOutCubic(1000);
        // surface.ui.eventManagers.main.centerOn("Aworld.perspective", [
        //   mid[0],
        //   mid[1],
        //   0,
        // ]);
      },
    });

    // Update the graphics one last time to ensure the final state is rendered
    await updateGraphics(results, true);
  };

  renderAABB(region: IAABB) {
    const surface = this.surface;
    if (!surface) return;
    const thickness: Vec2 = [2, 2];

    // Top edge
    surface.providers.boxes.add(
      new EdgeInstance({
        start: [region.x, region.y],
        end: [region.x + region.width, region.y],
        thickness,
        startColor: [1, 0, 0, 1],
        endColor: [1, 0, 0, 1],
      })
    );

    // Right edge
    surface.providers.boxes.add(
      new EdgeInstance({
        start: [region.x + region.width, region.y],
        end: [region.x + region.width, region.y + region.height],
        thickness,
        startColor: [1, 0, 0, 1],
        endColor: [1, 0, 0, 1],
      })
    );

    // Bottom edge
    surface.providers.boxes.add(
      new EdgeInstance({
        start: [region.x + region.width, region.y + region.height],
        end: [region.x, region.y + region.height],
        thickness,
        startColor: [1, 0, 0, 1],
        endColor: [1, 0, 0, 1],
      })
    );

    // Left edge
    surface.providers.boxes.add(
      new EdgeInstance({
        start: [region.x, region.y + region.height],
        end: [region.x, region.y],
        thickness,
        startColor: [1, 0, 0, 1],
        endColor: [1, 0, 0, 1],
      })
    );
  }

  destroy() {
    if (this.surface && this.surface.ui) {
      this.surface.ui.destroy();
    }
    if (this.loopId) stopAnimationLoop(this.loopId);
  }

  render() {
    const { className, containerProps, mode, store } = this.props;
    const { network: _network } = store;

    return (
      <div
        ref={this.container}
        className={classnames("NetworkRender", mode, className)}
        {...containerProps}
      ></div>
    );
  }
}
