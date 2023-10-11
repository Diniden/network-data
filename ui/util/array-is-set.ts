/**
 * This method checks if an array is EXACTLY the same as a set. This attempts to
 * perform the operation as fast as possible.
 */
export function arrayIsSet<T>(a: T[], s: Set<T>): boolean {
  if (a.length !== s.size) {
    return false;
  }

  for (let i = 0, iMax = a.length; i < iMax; ++i) {
    if (!s.has(a[i])) return false;
  }

  return true;
}
