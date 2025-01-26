import { observer } from "mobx-react";
import * as React from "react";
import { MakeNetworkProps } from "../../data/make-network-props";
import { NetworkRender } from "./network-render/network-render";

export interface IRenderImage {}

@observer
export class RenderImage extends React.Component<IRenderImage> {
  state = {};
  networkData: any = MakeNetworkProps().logo();

  render() {
    return <NetworkRender {...this.networkData} />;
  }
}
