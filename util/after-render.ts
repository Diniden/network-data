import { NOOP } from "./no-op.js";
import { wait } from "./wait.js";

/**
 * A dubious method to help with dubious times. Used to call for updates during
 * specialized render callbacks like <Route render>.
 */
export async function afterRender(fn: Function = NOOP) {
  await wait(1);
  fn();
}
