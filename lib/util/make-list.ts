/**
 * Makes a simpler way to copy a single or list of items to a new array.
 */
export function makeList<T>(items: T | T[]) {
  return Array.isArray(items) ? items.slice(0) : [items];
}
