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
  secondKey: U,
  defaultValue?: V
): V | void {
  let nextMap = map.get(firstKey);

  if (!nextMap) {
    if (defaultValue !== void 0) {
      nextMap = new Map();
      nextMap.set(secondKey, defaultValue);
      map.set(firstKey, nextMap);

      return defaultValue;
    }

    return;
  }

  let value = nextMap.get(secondKey);

  if (value === void 0) {
    if (defaultValue !== void 0) {
      nextMap.set(secondKey, defaultValue);
      value = defaultValue;
    }
  }

  return value;
}
