import { Accessor, isAccessorMethod } from "../types";

/**
 * Uses an accessor to access a chunk of data
 */
export function access<T, U, V>(
  data: T,
  accessor: Accessor<T, U, V> | undefined,
  guard: (val: any) => val is U,
  meta?: V
): U | null {
  if (accessor) {
    if (isAccessorMethod(accessor)) {
      const val = accessor(data, meta);
      if (guard(val)) return val;
    } else {
      const val = data[accessor];
      if (guard(val)) return val;
    }
  }

  return null;
}
