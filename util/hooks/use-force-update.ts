import React from "react";

/**
 * Simple hook that provides a forceUpdate method
 */
export function useForceUpdate() {
  const [, setValue] = React.useState(0);
  return () => setValue((v) => v + 1);
}
