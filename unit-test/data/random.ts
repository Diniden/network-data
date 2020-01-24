/** Get a random item from a list */
export function randItem<T>(rand: Function, list: T[]): T {
  return list[rand(list.length)];
}

/**
 * This produces a list of randomized numbers (length of 'count') that will sum together to be the 'total'.
 */
export function randomSum(rand: Function, total: number, count: number) {
  const picks = count;
  const n = total + picks - 1;
  const r = [];
  const rSet = new Set();

  for (let i = 0; i < picks - 1; ++i) {
    let num = rand((n - 1) + 1);
    while (rSet.has(num)) num = rand((n - 1) + 1);
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

  return choices;
}

/**
 * Get two random items from a list that are both different. Returns null when not enough items available. This works
 * for Objects (Object, Function) NOT traditional primitives (string, number)
 */
export function exclusiveRandItems<T>(rand: Function, list: T[], count: number): T[] {
  // We return null here as there are not enough items to make an exclusive list of 'count' length.
  if (list.length < count) return null;
  // If the count length is as long as the list, then we just return the entire list.
  if (list.length === count) return list.slice(0);

  // In this case, it is faster to randomly pick elements to exclude
  if (list.length - count < count) {
    const pick = randomSum(rand, list.length, list.length - count);
    const out = list.slice(0);
    const toRemove = [];
    pick.reduce((p, n) => {
      toRemove.push(p + n);
    }, 0);

    for (let i = toRemove.length - 1; i >= 0; --i) {
      const index = toRemove[i];
      out.slice(index, 1);
    }

    return out;
  }

  // Otherwise, do the traditional pick random items to include
  else {
    const out = [];
    const pick = randomSum(rand, list.length, count + 1);
    pick.pop();
    pick.reduce((p, n) => out.push(list[p + n]), 0);
  }
}
