import { Identifier } from "../types";
import {
  ISpreadOptions,
  ISpreadResponseOptions,
  ISpreadResult,
  ISpreadState,
  spread,
} from "./spread";

/**
 * This describes how a spread operation interacts with other spread operations
 * happening simultaneously. The also governs the association order for when
 * spread operations reach nodes in the same iteration.
 */
export enum SpreadLayerPriority {
  /**
   * Will execute on nodes that have been visited by other layers. The
   * association priority stays in the order the spread operations occurred.
   */
  BLENDS,
  /**
   * Will execute on nodes that have been visited by previous layers and will
   * place this on top of the associations
   */
  PRIORITIZE,
  /**
   * Will not execute on a visited node and stop spreading from that point.
   */
  TERMINATES,
  /**
   * Once a visited node is discovered, the entire spread operation quits
   * immediately and will not broadcast any more results.
   */
  COMPLETELY_TERMINATES,
  /**
   * When this hits a visited node of another spread operation, it will
   * immediately terminate the OTHER spread operations associated with that node
   * at that node.
   */
  TERMINATES_OTHERS,
  /**
   * When this hits a visited node of another spread operation, it will
   * immediately cancel the OTHER spread operations associated with that node
   * such that the found spread operation stops entirely on all nodes it was
   * operating on.
   */
  COMPLETELY_TERMINATES_OTHERS,
}

/**
 * The configuration for an entry within this manager.
 */
export interface ISpreadManagerEntry<TNodeMeta, TEdgeMeta> {
  id: Identifier;
  spread: Omit<ISpreadOptions<TNodeMeta, TEdgeMeta>, "result">;
  complete: Promise<ISpreadResult<TNodeMeta, TEdgeMeta>>;
  priority: SpreadLayerPriority;
  result: ISpreadOptions<TNodeMeta, TEdgeMeta>["results"];
}

/**
 * This allows for the creation of a manager that can handle multiple spread
 * routines and offer controls to govern the expected results per spread
 * operation.
 *
 * If you are using this manager, you should NOT listen to the results of each
 * spread operation and should instead use this manager's feedback to view the
 * results of the combined spread operations.
 */
export class SpreadManager<TNodeMeta, TEdgeMeta> {
  /** All spread entries being monitored by this manager. */
  entries: ISpreadManagerEntry<TNodeMeta, TEdgeMeta>[] = [];

  /**
   * This handles the results from a single spread operation.
   */
  handleSpreadResult =
    (_id: Identifier) =>
    async (
      _data: ISpreadResult<TNodeMeta, TEdgeMeta>,
      _state: ISpreadState<TNodeMeta, TEdgeMeta>
    ): Promise<ISpreadResponseOptions> => {
      const response = { stop: false };
      return response;
    };

  /**
   * Create and add a new spread operation for this manage to monitor.
   */
  add(options: Omit<ISpreadManagerEntry<TNodeMeta, TEdgeMeta>, "complete">) {
    // Start up a new spread operation based on the options provided
    const complete = spread({
      ...options.spread,
      results: this.handleSpreadResult(options.id),
    });

    this.entries.push({
      id: options.id,
      spread: options.spread,
      complete,
      priority: options.priority,
      result: options.result,
    });
  }
}
