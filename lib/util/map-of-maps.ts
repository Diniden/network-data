/**
 * This is a helper to add a value to a map of maps.
 */
export function addToMapOfMaps<T, U, V>(
  map: Map<T, Map<U, V>>,
  firstKey: T,
  secondKey: U,
  value: V
) {
  let nextMap = map.get(firstKey);

  if (!nextMap) {
    nextMap = new Map();
    map.set(firstKey, nextMap);
  }

  nextMap.set(secondKey, value);
}

/**
 * This is a helper to remove a value from a map of maps
 */
export function removeFromMapOfMaps<T, U, V>(
  map: Map<T, Map<U, V>>,
  firstKey: T,
  secondKey: U
) {
  const nextMap = map.get(firstKey);
  if (!nextMap) return false;
  return nextMap.delete(secondKey);
}

/**
 * This is a helper to get a value from a map of maps
 */
export function getFromMapOfMaps<T, U, V>(
  map: Map<T, Map<U, V>>,
  firstKey: T,
  secondKey: U
): V | null {
  const nextMap = map.get(firstKey);
  if (!nextMap) return null;
  return nextMap.get(secondKey) || null;
}
