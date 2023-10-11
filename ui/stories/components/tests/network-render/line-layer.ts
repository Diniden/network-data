import {
  EdgeInstance,
  GLSettings,
  ILayerProps,
  InstanceAttributeSize,
  InstanceProvider,
  IShaderInitialization,
  Layer2D,
  VertexAttributeSize,
} from "deltav";

export interface ILineLayer extends ILayerProps<EdgeInstance> {}

export class LineLayer extends Layer2D<EdgeInstance, ILineLayer> {
  static defaultProps: ILayerProps<EdgeInstance> = {
    key: "line-layer",
    data: new InstanceProvider<EdgeInstance>(),
  };

  initShader(): IShaderInitialization<EdgeInstance> {
    const vertices = [1, 0];
    return {
      drawMode: GLSettings.Model.DrawMode.LINES,
      fs: `
varying vec4 vertexColor;

void main () {
  gl_FragColor = vertexColor;
  gl_FragColor.a = 0.1;
}
      `,
      vs: `
varying vec4 vertexColor;

void main() {
  // Get the position of the current vertex
  vec2 currentPosition = mix(start, end, position);
  // Start on the calculated line and push out by the normal's value
  vec2 vertexPos = currentPosition;
  // Get the color based on where we are on the line
  vertexColor = mix(startColor, endColor, position);

  gl_Position = clipSpace(vec3(vertexPos, depth));
  gl_PointSize = 5.0;
}
      `,

      instanceAttributes: [
        {
          name: "start",
          size: InstanceAttributeSize.TWO,
          update: (o) => o.start,
        },
        {
          name: "end",
          size: InstanceAttributeSize.TWO,
          update: (o) => o.end,
        },
        {
          name: "startColor",
          size: InstanceAttributeSize.FOUR,
          update: (o) => o.startColor,
        },
        {
          name: "endColor",
          size: InstanceAttributeSize.FOUR,
          update: (o) => o.endColor,
        },
        {
          name: "depth",
          size: InstanceAttributeSize.ONE,
          update: (o) => [o.depth],
        },
      ],
      vertexAttributes: [
        {
          name: "position",
          size: VertexAttributeSize.ONE,
          update: (v) => [vertices[v]],
        },
      ],
      vertexCount: 2,
    };
  }
}
