import * as React from "react";
import { MakeNetworkProps } from "../../data/make-network-props";
import { NetworkRender } from "./network-render/network-render";
import { RenderEnron } from "./render-enron";
import { StoryFn } from "@storybook/react";

export default {
  title: "Tests/Make Network",
  component: NetworkRender,
  args: {},
  argTypes: {
    mode: { type: "selection" },
    children: { table: { disable: true } },
    className: { table: { disable: true } },
    containerProps: { table: { disable: true } },
  },
};

const Template = (store?: any) => (args: any) => <NetworkRender {...store} />;

export const Basic: StoryFn = Template(MakeNetworkProps().simpleNetwork()).bind(
  {}
);

export const TwoNodes: StoryFn = Template(MakeNetworkProps().twoNodes()).bind(
  {}
);

export const Flower: StoryFn = Template(MakeNetworkProps().flower()).bind({});

export const Circle: StoryFn = Template(MakeNetworkProps().circle()).bind({});

export const Line: StoryFn = Template(MakeNetworkProps().line()).bind({});

export const Complex: StoryFn = Template(MakeNetworkProps().complex()).bind({});

export const Disconnected: StoryFn = Template(
  MakeNetworkProps().disconnected()
).bind({});

const EnronTemplate = (_children?: any) => (args: any) => (
  <RenderEnron {...args} />
);

export const Enron: StoryFn = EnronTemplate().bind({});
