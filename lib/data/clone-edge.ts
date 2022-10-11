import { Identifier, IEdge } from "../types";

/**
 * Makes a new edge with the same properties as the input. You can optionally make a new identifier for the clones element.
 */
export function cloneEdge<TNodeMeta, TEdgeMeta>(
  a: IEdge<TNodeMeta, TEdgeMeta>,
  id?: Identifier
): IEdge<TNodeMeta, TEdgeMeta> {
  return {
    id: id ? id : a.id,
    in: a.in,
    out: a.out,
    inOutFlow: Array.isArray(a.inOutFlow) ? a.inOutFlow.slice(0) : a.inOutFlow,
    outInFlow: Array.isArray(a.outInFlow) ? a.outInFlow.slice(0) : a.outInFlow,
    meta: a.meta
  };
}
