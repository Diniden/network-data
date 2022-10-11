import { INetworkData } from "../types";

/**
 * This method will calculate the intersection of elements between two networks.
 *
 * Intersection means only elements that appear in Set A AND Set B
 *
 * A: {1, 3, 4, 9}
 * B: {2, 4, 5, 9}
 *
 * result: {4, 9}
 */
export function intersection<TNodeMeta, TEdgeMeta>(
  a: INetworkData<TNodeMeta, TEdgeMeta>,
  b: INetworkData<TNodeMeta, TEdgeMeta>
) {}

export function union() {}
