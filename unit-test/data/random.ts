/** Get a random item from a list */
export function randItem<T>(rand: Function, list: T[]): T {
  return list[rand(list.length)];
}

/**
 * This produces a list of randomized numbers (length of 'count') that will sum
 * together to be the 'total'.
 *
 * When count is <= 0, this will return an empty set.
 */
export function randomSum(rand: Function, total: number, count: number) {
  const picks = count;
  const n = total + picks - 1;
  const r = [];
  const rSet = new Set();

  if (count < 1) return [];
  if (count === 1) return [total];

  for (let i = 0; i < picks - 1; ++i) {
    let num = rand(n - 1 + 1);
    while (rSet.has(num)) num = rand(n - 1 + 1);
    r.push(num);
    rSet.add(num);
  }

  r.sort((a, b) => a - b);
  const choices = [];

  for (let i = 0; i < picks - 1; ++i) {
    let sum = r[i];

    if (i > 0) {
      sum -= r[i - 1];
    }

    choices.push(sum - 1);
  }

  choices.push(n - r[r.length - 1]);
  let correction = 0;

  // Ensure negative numbers do not slide through. When a negative number is
  // found, we set the negative to a 1 and spread out the corrective delta
  // across the remaining number by decrementing them until the correction has
  // been appeased.
  for (let i = 0; i < choices.length; ++i) {
    if (choices[i] < 0) {
      correction += -choices[i];
      correction += 1;
      choices[i] = 1;
    } else if (choices[i] > 1 && correction > 0) {
      choices[i]--;
      correction--;
    }
  }

  // One more pass to see if we can spread out the correction more
  if (correction > 0) {
    while (correction > 0) {
      const start = correction;

      for (let i = 0; i < choices.length; ++i) {
        if (choices[i] > 1 && correction > 0) {
          choices[i]--;
          correction--;
        }

        if (correction <= 0) break;
      }

      // If the correction distribution did not change correction in a full
      // pass, it will never reach 0. This is a safety net to prevent an
      // infinite loop.
      if (correction === start) break;
    }
  }

  // If correction still remains, the algorithm has failed
  if (correction > 0) {
    throw new Error("Failed to generate random sum");
  }

  return choices;
}

/**
 * Get random items from a list that are all different. Returns a copy of
 * the original list if count is bigger than the list.
 *
 * The resulting set remain in the same order as they appear in the original
 * list.
 */
export function orderedRandItems<T>(
  rand: Function,
  list: T[],
  count: number,
  feedback?: (pick: number[], exclude?: boolean) => void
): T[] {
  // We return null here as there are not enough items to make an exclusive list
  // of 'count' length.
  if (list.length < count) return list.slice(0);
  // If the count length is as long as the list, then we just return the entire
  // list.
  if (list.length === count) return list.slice(0);

  // In this case, it is faster to randomly pick elements to exclude
  if (list.length - count < count) {
    const pick = randomSum(rand, list.length, list.length - count);
    const out = list.slice(0);
    const toRemove: number[] = [];

    pick.reduce((p, n) => {
      toRemove.push(p + n);
      return p + n;
    }, 0);

    for (let i = toRemove.length - 1; i >= 0; --i) {
      out.splice(toRemove[i], 1);
    }

    feedback?.(pick, true);
    return out;
  }

  // Otherwise, do the traditional pick random items to include
  else {
    const out: T[] = [];
    const pick = randomSum(rand, list.length, count + 1);
    pick.pop();
    pick.reduce((p, n) => {
      out.push(list[p + n]);
      return p + n;
    }, 0);

    feedback?.(pick, false);
    return out;
  }
}
