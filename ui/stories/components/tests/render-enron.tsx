import { observer } from "mobx-react";
import * as React from "react";
import { MakeNetworkProps } from "../../data/make-network-props";
import { NetworkRender } from "./network-render/network-render";

/**
 * RenderEnron props
 */
export interface IRenderEnron {}

@observer
export class RenderEnron extends React.Component<IRenderEnron> {
  state = {};
  networkData: any = MakeNetworkProps().organic();

  render() {
    return <NetworkRender {...this.networkData} />;
  }
}
