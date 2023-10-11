import {
  BasicCamera2DController,
  BasicSurface,
  Camera2D,
  CircleInstance,
  CircleLayer,
  ClearFlags,
  createLayer,
  createView,
  EdgeInstance,
  EdgeLayer,
  EdgeType,
  GLSettings,
  InstanceProvider,
  View2D,
} from "deltav";
import { LineLayer } from "./line-layer";

export class Surface {
  ui: ReturnType<Surface["makeSurface"]>;
  providers = {
    nodes: new InstanceProvider<CircleInstance>(),
    edges: new InstanceProvider<EdgeInstance>(),
    boxes: new InstanceProvider<EdgeInstance>(),
  };

  constructor(container: HTMLElement) {
    this.ui = this.makeSurface(container);
  }

  makeSurface(container: HTMLElement) {
    return new BasicSurface({
      container,
      rendererOptions: {
        antialias: false,
        premultipliedAlpha: true,
      },
      providers: this.providers,
      cameras: {
        main: new Camera2D({
          offset: [0, 0, 0],
          scale: [1, 1, 1],
        }),
      },
      resources: {},
      eventManagers: (cameras) => ({
        main: new BasicCamera2DController({
          camera: cameras.main,
          startView: ["Aworld.perspective"],
          wheelShouldScroll: false,
        }),
      }),
      scenes: (_resources, providers, cameras, _managers) => {
        const pipeline = {
          // Render nodes and edges
          Aworld: {
            views: {
              perspective: createView(View2D, {
                camera: cameras.main,
                clearFlags: [ClearFlags.COLOR, ClearFlags.DEPTH],
                background: [0.01, 0.01, 0.01, 1],
              }),
            },
            layers: {
              // a: createLayer(EdgeLayer, {
              //   data: providers.edges,
              //   type: EdgeType.LINE,
              //   materialOptions: {
              //     depthTest: true,
              //     blending: {
              //       blendDst:
              //         GLSettings.Material.BlendingDstFactor.OneMinusSrcAlpha,
              //       blendEquation:
              //         GLSettings.Material.BlendingEquations.Subtract,
              //       blendSrc: GLSettings.Material.BlendingSrcFactor.SrcAlpha,
              //     },
              //   },
              // }),
              a: createLayer(LineLayer, {
                data: providers.edges,

                materialOptions: {
                  depthTest: true,
                  blending: {
                    blendDst:
                      GLSettings.Material.BlendingDstFactor.OneMinusSrcAlpha,
                    blendEquation:
                      GLSettings.Material.BlendingEquations.Subtract,
                    blendSrc: GLSettings.Material.BlendingSrcFactor.SrcAlpha,
                  },
                },
              }),
            },
          },

          BWorld: {
            views: {
              perspective: createView(View2D, {
                camera: cameras.main,
                clearFlags: [ClearFlags.DEPTH],
                background: [0.01, 0.01, 0.01, 1],
              }),
            },
            layers: {
              b: createLayer(CircleLayer, {
                data: providers.nodes,
                materialOptions: {
                  blending: {
                    blendDst:
                      GLSettings.Material.BlendingDstFactor.OneMinusSrcAlpha,
                    blendEquation:
                      GLSettings.Material.BlendingEquations.Subtract,
                    blendSrc: GLSettings.Material.BlendingSrcFactor.SrcAlpha,
                  },
                },
              }),
            },
          },

          // Debugging visuals
          CWorld: {
            views: {
              perspective: createView(View2D, {
                camera: cameras.main,
                clearFlags: [ClearFlags.DEPTH],
                background: [0.01, 0.01, 0.01, 1],
              }),
            },
            layers: {
              c: createLayer(EdgeLayer, {
                data: providers.boxes,
                type: EdgeType.LINE,
              }),
            },
          },
        };

        return pipeline as any;
      },
    });
  }
}
