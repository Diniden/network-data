import React from "react";

type GroupMap = Map<
  string | React.JSXElementConstructor<any> | React.JSXElementConstructor<any>,
  React.ReactNode[]
>;

/**
 * This is a helper method to sort a list of react children into groups, based
 * on their type. This accounds for nested React Fragments.
 */
export function groupReactChildren(children: React.ReactNode): GroupMap {
  const groups: GroupMap = new Map();
  const toProcess: React.ReactNode[] = [];

  React.Children.forEach(children, (child, _i) => {
    toProcess.push(child);
  });

  toProcess.reverse();

  while (toProcess.length > 0) {
    const child = toProcess.pop();
    if (!React.isValidElement(child)) continue;

    if (child !== void 0 && child?.type === React.Fragment) {
      const reverse: React.ReactNode[] = [];

      React.Children.forEach(
        (child?.props as unknown as any)?.children || [],
        (fragChild) => {
          reverse.push(fragChild);
        }
      );

      for (let i = reverse.length - 1; i >= 0; --i) {
        toProcess.push(reverse[i]);
      }
    } else if (child !== void 0) {
      let group = groups.get(child.type);

      if (!group) {
        group = [];
        groups.set(child.type, group);
      }

      group.push(child);
    }
  }

  return groups;
}
