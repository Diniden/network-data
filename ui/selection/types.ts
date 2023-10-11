import { Identifier, INode } from "../types";

/**
 * Error reporting for the grouping operation
 */
export interface IGroupError<TNodeMeta, TEdgeMeta> {
  type: Identifier;
  nodes: Set<INode<TNodeMeta, TEdgeMeta>>;
  message?: string;
}

/**
 * Results from a grouping selection.
 */
export interface IGroupResults<TNodeMeta, TEdgeMeta> {
  /**
   * All of the groups of nodes. Each group has no connection to the other
   * groups.
   */
  groups: INode<TNodeMeta, TEdgeMeta>[][];
  /**
   * A Set representing each group in the groups returned. This is just
   * convenient and useful for quick comparisons and is typically generated
   * during common operations thus is preserved for further use.
   */
  groupSets: Set<INode<TNodeMeta, TEdgeMeta>>[];
  /** Errors discovered while processing the group result */
  errors?: IGroupError<TNodeMeta, TEdgeMeta>[];
}
