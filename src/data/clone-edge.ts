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
    a: a.a,
    b: a.b,
    atob: Array.isArray(a.atob) ? a.atob.slice(0) : a.atob,
    btoa: Array.isArray(a.btoa) ? a.btoa.slice(0) : a.btoa,
    meta: a.meta
  };
}
