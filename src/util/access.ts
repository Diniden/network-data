import { Accessor, isAccessorString } from "../types";

/**
 * Uses an accessor to access a chunk of data
 */
export function access<T, U>(
  data: T,
  accessor: Accessor<T, U> | undefined,
  guard: (val: any) => val is U
): U | null {
  if (accessor) {
    if (isAccessorString(accessor)) {
      const val = data[accessor];
      if (guard(val)) return val;
    } else {
      return accessor(data);
    }
  }

  return null;
}
