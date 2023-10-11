import { add2, compare2, copy2, scale2, subtract2, Vec2 } from "deltav";
import { sortNodes, SortNodesMode } from "../data/sort-nodes";
import { Identifier, INetworkData, INode } from "../types";
import { ILayout, ILayoutNode, ILayoutResult } from "./types";

export interface IGamePiece<TNodeMeta, TEdgeMeta>
  extends ILayoutNode<TNodeMeta, TEdgeMeta> {
  /** The generated x position of the node */
  x: number;
  /** The generated y position of the node */
  y: number;
  /**
   * The calculated rendered radius of the node. This has no bearing on the
   * simulation as the simulation is cell based.
   */
  r: number;
  /** Associated data with the force */
  d: INode<TNodeMeta, TEdgeMeta>;

  /** Current cell the piece is located */
  cell: Vec2;
  /** Stores this node's next move vector */
  move: Vec2;
  /**
   * In order to reduce "traps", each game piece needs a certain amount of
   * staying on course in a direction. We will call it momentum, but it's rule
   * based momentum not "real" physics by any stretch.
   */
  momentum: Vec2;
  /** Helps reduce noisy movement as well */
  inertia: number;
  /**
   * Stores the nodes calculated move direction based on the total move vector
   */
  moveDir: Vec2;
  /** The calculated power the node has to make it's next move */
  power: number;
}

/**
 * Defines a link that has had it's source and target indices resolved to
 * point to the actual force objects.
 */
export interface IResolvedLink<TNodeMeta, TEdgeMeta> {
  /** Index of the source within the node list handed to d3 */
  source: IGamePiece<TNodeMeta, TEdgeMeta>;
  /** Index of the target within the node list handed to d3 */
  target: IGamePiece<TNodeMeta, TEdgeMeta>;
}

/**
 * Results provided by the force layout
 */
export interface IGridGameLayoutResult<TNodeMeta, TEdgeMeta>
  extends ILayoutResult<TNodeMeta, TEdgeMeta> {
  /** The force nodes created to describe the layout */
  nodes: IGamePiece<TNodeMeta, TEdgeMeta>[];
  /** Helps resolve some queries easier by providing this lookup */
  nodeById: Map<Identifier | void, IGamePiece<TNodeMeta, TEdgeMeta>>;
  /** The edges based on the force nodes created to describe the layout */
  edges: IResolvedLink<TNodeMeta, TEdgeMeta>[];
}

export interface IGridGameOptions<TNodeMeta, TEdgeMeta>
  extends ILayout<TNodeMeta, TEdgeMeta> {
  /** The center of the simulation x-axis */
  centerX: number;
  /** The center of the simulation y-axis */
  centerY: number;
  /** Provide a width for each cell in the game */
  cellWidth?: number;
  /** Provide a height for each cell in the game */
  cellHeight?: number;
  /**
   * This is the number of steps the simulation will take. A value of -1 makes
   * the simulation run forever.
   */
  steps?: number;

  /**
   * Callback that allows the caller to abruptly quit the simulation. Simply
   * return true in this callback to quit the simulation.
   */
  quitTrigger?(): boolean;

  /**
   * When provided, this can provide a trigger to induce a spread operation. The
   * trigger just has to be different from the previous trigger to cause the
   * spread to happen.
   */
  spreadTrigger?(): { trigger: number; spread: number };

  /**
   * When provided triggers a removal on empty columns and rows. The trigger
   * just has to be different from the previous trigger to cause the removal to
   * happen.
   */
  compressTrigger?(): number;

  /**
   * This triggers all of the nodes to move toward the center of the current
   * bounds of the nodes. All nodes when moving toward this point will be given
   * an equal power of movement so they will not fight for dominance, but they
   * will have the ability to wiggle within empty spaces.
   */
  gatherTrigger?(): number;

  /**
   * Event happens when the board is spread effectively scaling it by the spread
   * factor in all directions.
   */
  onSpread?(spread: number): void;
}

interface Gameboard<TNodeMeta, TEdgeMeta> {
  /**
   * The Gameboard is always square. This is how many cells long a side of that
   * square is
   */
  size: number;
  /** The coordinates of the center cell of the gameboard */
  center: [number, number];
  /** Physical Dimension of the cell */
  cellWidth: number;
  /** Half of the Physical Dimension of the cell */
  cellWidthHalf: number;
  /** Physical Dimension of the cell */
  cellHeight: number;
  /** Half of the Physical Dimension of the cell */
  cellHeightHalf: number;
  /**
   * All of the cells of the gameboard. A single GamePiece may occupy a cell or
   * the cell is unoccupied.
   */
  cells: (IGamePiece<TNodeMeta, TEdgeMeta> | undefined)[][];
  /**
   * The monitors how much in fighting the game pieces are having. Everytime a
   * node requests the position of another node, this number increases.
   */
  tension: number;
  /**
   * Triggers all nodes in the game to move towards the center of the bounds of
   * the pieces. This changes their movement to be uniform in power to prevent
   * fighting for spots and encourages simple movement instead.
   */
  gather: boolean;
}

interface GamePieces<TNodeMeta, TEdgeMeta> {
  nodes: IGamePiece<TNodeMeta, TEdgeMeta>[];
  edges: IResolvedLink<TNodeMeta, TEdgeMeta>[];
}

/**
 * Generates all of the pieces that will participate in the simulation.
 */
function generatePieces<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>
): GamePieces<TNodeMeta, TEdgeMeta> {
  // First let's initially sort nodes by some criteria and create the node
  // layout objects for each node
  const placements: IGamePiece<TNodeMeta, TEdgeMeta>[] = [];
  const placementByNode = new Map<
    INode<TNodeMeta, TEdgeMeta>,
    IGamePiece<TNodeMeta, TEdgeMeta>
  >();

  const nodes = sortNodes(
    network.nodes.slice(0),
    SortNodesMode.MOST_EDGES_TOTAL_FIRST
  );

  // Create game pieces for each node
  nodes.forEach((n) => {
    const placement: IGamePiece<TNodeMeta, TEdgeMeta> = {
      x: 0,
      y: 0,
      r: 0,
      d: n,
      cell: [0, 0],
      move: [0, 0],
      momentum: [0, 0],
      inertia: 0,
      power: 1,
      moveDir: [0, 0],
    };

    placements.push(placement);
    placementByNode.set(n, placement);
  });

  // Create edges for each game piece using the network's already established
  // edges to compute that.
  const edges: IResolvedLink<TNodeMeta, TEdgeMeta>[] = [];

  for (let i = 0, iMax = network.edges.length; i < iMax; ++i) {
    const edge = network.edges[i];
    const source = placementByNode.get(edge.in);
    const target = placementByNode.get(edge.out);

    if (source && target) {
      edges.push({
        source,
        target,
      });
    }
  }

  return {
    nodes: placements,
    edges,
  };
}

/**
 * Generates the necessary metrics for the board.
 */
function generateBoard<TNodeMeta, TEdgeMeta>(
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  options: IGridGameOptions<TNodeMeta, TEdgeMeta>
): Gameboard<TNodeMeta, TEdgeMeta> {
  // Now let's compute a game baord size appropriate for the number of nodes we
  // have
  let boardSize = Math.ceil(Math.sqrt(pieces.nodes.length)) * 2;
  // Make sure there is a dead center to the board by having an odd dimension
  boardSize += boardSize % 2 === 0 ? 1 : 0;

  const cellWidth = options.cellWidth || 25;
  const cellHeight = options.cellHeight || 25;

  return {
    size: boardSize,
    center: [Math.ceil(boardSize / 2), Math.ceil(boardSize / 2)],
    cellWidth,
    cellHeight,
    cellHeightHalf: cellHeight / 2,
    cellWidthHalf: cellWidth / 2,
    cells: new Array(boardSize)
      .fill(0)
      .map((_) => new Array(boardSize).fill(0).map((_) => void 0)),
    tension: 0,
    gather: false,
  };
}

/**
 * Calculates a circle of a given range distance around a given board cell
 * (technically it circles the location like a diamond:
 *
 * This is a circle with a range of 3.
 *
 * ```
 *      x
 *     x x
 *    x   x
 *   x  o  x
 *    x   x
 *     x x
 *      x
 * ```
 *
 * This returns all of the cell's coordinates that comprises the circle.
 */
function circleRange(
  centerX: number,
  centerY: number,
  range: number,
  maxCells: number
): [number, number][] {
  let cursor: Vec2 = [centerX, centerY - range];
  let out: Vec2[] = [];

  while (cursor[1] < centerY && out.length < maxCells) {
    out.push([(cursor[0] += 1), (cursor[1] += 1)]);
  }

  while (cursor[0] > centerX && out.length < maxCells) {
    out.push([(cursor[0] -= 1), (cursor[1] += 1)]);
  }

  while (cursor[1] > centerY && out.length < maxCells) {
    out.push([(cursor[0] -= 1), (cursor[1] -= 1)]);
  }

  while (cursor[0] < centerX && out.length < maxCells) {
    out.push([(cursor[0] += 1), (cursor[1] -= 1)]);
  }

  if (out.length === 0) {
    out.push(cursor);
  }

  return out;
}

/**
 * Applies a cell location to a node.
 */
function placeNode<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  node: IGamePiece<TNodeMeta, TEdgeMeta> | undefined,
  x: number,
  y: number
) {
  if (node) {
    node.momentum[0] = node.cell[0];
    node.momentum[1] = node.cell[1];
    node.inertia = 5;
    node.cell[0] = x;
    node.cell[1] = y;
  }

  let row = board.cells[x];

  // Board can grow as needed to accomodate any node
  if (!row) row = board.cells[x] = [];
  board.cells[x][y] = node;
}

/**
 * Applies a cell location to a node by Vec2
 */
function placeNodeAt<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  node: IGamePiece<TNodeMeta, TEdgeMeta> | undefined,
  cell: Vec2
) {
  placeNode(board, node, cell[0], cell[1]);
}

/**
 * Performs a strategy to lay out all of the nodes on the board.
 */
function beginNodeLayout<TNodeMeta, TEdgeMeta>(
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  board: Gameboard<TNodeMeta, TEdgeMeta>
) {
  const { 0: centerX, 1: centerY } = board.center;
  const nodes = pieces.nodes;

  for (let i = 0, range = 0, iMax = nodes.length; i < iMax; ++range) {
    const toFill = circleRange(centerX, centerY, range, nodes.length - i);

    for (let k = 0, kMax = toFill.length; k < kMax && i < iMax; ++k, ++i) {
      const { 0: cellX, 1: cellY } = toFill[k];
      placeNode(board, nodes[i], cellX, cellY);
    }
  }
}

/**
 * Final step that converts our integer cell coordinates to the middle of the
 * cell they represent.
 */
async function convertCellsToCoordinates<TNodeMeta, TEdgeMeta>(
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  options: IGridGameOptions<TNodeMeta, TEdgeMeta>,
  broadcast: boolean = true
) {
  const { nodes } = pieces;
  const { cellWidth, cellWidthHalf, cellHeight, cellHeightHalf } = board;

  // Calculate maximum radius a node can be within a cell.
  const maxR = Math.min(cellWidth, cellHeight);

  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];
    node.x = node.cell[0] * cellWidth + cellWidthHalf;
    node.y = node.cell[1] * cellHeight + cellHeightHalf;
    node.r = maxR / 2;
  }

  if (broadcast) {
    await options.onLayoutUpdate?.({
      nodes,
      nodeById: new Map(),
      edges: pieces.edges,
    });
  }
}

/**
 * This is a list of all directions in clockwise order based on a mapping to
 * quickly determine index
 * [0, 1, 2]
 * [7, x, 3]
 * [6, 5, 4]
 */
const directionIndex: number[][] = [];
directionIndex[-1] = [];
directionIndex[-1][-1] = 0;
directionIndex[-1][0] = 1;
directionIndex[-1][1] = 2;
directionIndex[0] = [];
directionIndex[0][-1] = 7;
directionIndex[0][0] = -1;
directionIndex[0][1] = 3;
directionIndex[1] = [];
directionIndex[1][-1] = 6;
directionIndex[1][0] = 5;
directionIndex[1][1] = 4;

const degreePowerModifiers = [
  // Zero steps is same direction
  1,
  // One step is a slight mismatch
  0.9,
  // Two steps is a moderate mismatch
  0.5,
  // Four steps is opposite directions
  0,
];

/**
 * There are 8 different possible directions a node can move to swap places with
 * another node. This function determines the power modifier based on the
 * direction of the node's move vector and the direction of the target node's
 * move vector.
 *
 * The power modifier is a value between 0 and 1 that is applied to the node's
 * power to determine the power of the node's move.
 *
 * If the node's move vector is the same as the target node's move vector, the
 * power modifier is 1.
 *
 * If the node's move vector is the opposite of the target node's move vector,
 * the power modifier is 0.
 *
 * Anything in between is a value between 0 and 1.
 *
 * The dir parameters should simply be values of -1, 0, or 1 for each axis.
 */
function determinePowerModifier(dir1: Vec2, dir2: Vec2) {
  const { 0: dx1, 1: dy1 } = dir1;
  const { 0: dx2, 1: dy2 } = dir2;

  // Same direction, no power modification
  if (dx1 === dx2 && dy1 === dy2) return 1;
  // Negate power if opposite direction
  if (dx1 === -dx2 && dy1 === -dy2) return 0;
  // Negate power if dir2 is 0
  if (dx2 === 0 && dy2 === 0) return 0;

  // Get the index of direction 1 and 2
  const index1 = directionIndex[dx1][dy1] || 0;
  const index2 = directionIndex[dx2][dy2] || 0;

  // Determine how many steps it takes to get from index1 to index2 in clockwise
  // order
  let steps = 0;
  let index = index1;

  while (index !== index2) {
    index = (index + 1) % 8;
    steps++;
  }

  return degreePowerModifiers[steps];
}

/**
 * Moves all of the game pieces by placing a blank cell horizontally and
 * vertically between every piece.
 */
async function spreadPieces<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  options: IGridGameOptions<TNodeMeta, TEdgeMeta>,
  spread: number
) {
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const node = pieces.nodes[i];
    if (!node) continue;
    const { 0: x, 1: y } = node.cell;
    // Move the cell to the new doubled location
    placeNode(board, node, x * spread, y * spread);
    placeNode(board, void 0, x, y);
  }

  options.onSpread?.(spread);
}

/**
 * Shifts every other col or row by one
 */
async function earthquake<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  colShift: number = 0,
  rowShift: number = 0
) {
  // Loop through all of the pieces. Those on even cols will be left alone,
  // those on odd cols get shifted
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const node = pieces.nodes[i];
    if (!node) continue;
    const { 0: x, 1: y } = node.cell;

    if (node.cell[0] % 2 === 0) {
      placeNode(board, node, x + colShift, y);
      placeNode(board, void 0, x, y);
    } else {
      placeNode(board, node, x, y + rowShift);
      placeNode(board, void 0, x, y);
    }
  }
}

/**
 * This attempts to keep the top left of the board occupied correctly. If pieces
 * are in cells with negative index we drift the board forward on that axis. If
 * the board has empty cells in the first cells (columns and rows) we drift the
 * board backwards on that axis.
 */
async function driftPieces<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  pieces: GamePieces<TNodeMeta, TEdgeMeta>
) {
  let driftX = 0;
  let driftY = 0;
  let minX = Number.MAX_SAFE_INTEGER;
  let minY = Number.MAX_SAFE_INTEGER;

  // Find the top left bounds of the contents of the board
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const cell = pieces.nodes[i];
    if (!cell) continue;

    minX = Math.min(minX, cell.cell[0]);
    minY = Math.min(minY, cell.cell[1]);
  }

  // Move that top corner to [0, 0]
  driftX = -minX;
  driftY = -minY;

  if (driftX === 0 && driftY === 0) return;

  // First apply drift x and y to all of the pieces. We can detemrine the bounds
  // of the existing pieces while we do this.
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const cell = pieces.nodes[i];
    if (!cell) continue;
    const { 0: x, 1: y } = cell.cell;

    // Move the cell to the new doubled location
    placeNodeAt(board, cell, [x + driftX, y + driftY]);
    // Place a blank cell where the node used to be
    placeNodeAt(board, void 0, [x, y]);
  }
}

/**
 * Finds completely empty rows and columns and removes them from the board to
 * aid in packing in the simulation and preventing excess space.
 */
async function removeEmptyRowsAndColumns<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  pieces: GamePieces<TNodeMeta, TEdgeMeta>
) {
  const hasRow = new Set();
  const hasCol = new Set();
  let maxX = 0;
  let maxY = 0;

  // Loop through all the pieces and use their coordinates to fill in which rows
  // and columns are populated.
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const cell = pieces.nodes[i];
    hasRow.add(cell.cell[1]);
    hasCol.add(cell.cell[0]);

    maxX = Math.max(maxX, cell.cell[0]);
    maxY = Math.max(maxY, cell.cell[1]);
  }

  // Stores how much a column index should be shifted left
  const shiftLeft = new Map<number, number>();
  const shiftUp = new Map<number, number>();

  let toShiftLeft = 0;
  let toShiftUp = 0;

  // Loop through all of the columns and shift each piece found based on empty
  // columns leading up to it.
  for (let i = 0; i <= maxX; ++i) {
    if (hasCol.has(i)) {
      shiftLeft.set(i, toShiftLeft);
    } else {
      toShiftLeft++;
    }
  }

  // Loop through all of the rows and shift each piece found based on empty rows
  // leading up to it
  for (let i = 0; i <= maxY; ++i) {
    if (hasRow.has(i)) {
      shiftUp.set(i, toShiftUp);
    } else {
      toShiftUp++;
    }
  }

  // Finally, loop through the pieces and apply the shifts
  for (let i = 0, iMax = pieces.nodes.length; i < iMax; ++i) {
    const cell = pieces.nodes[i];
    const { 0: x, 1: y } = cell.cell;

    placeNodeAt(board, cell, [
      x - (shiftLeft.get(x) || 0),
      y - (shiftUp.get(y) || 0),
    ]);
  }
}

/**
 * This runs the nodes through the game rules.
 */
async function playGame<TNodeMeta, TEdgeMeta>(
  board: Gameboard<TNodeMeta, TEdgeMeta>,
  pieces: GamePieces<TNodeMeta, TEdgeMeta>,
  options: IGridGameOptions<TNodeMeta, TEdgeMeta>
) {
  const { nodes, edges } = pieces;
  board.tension = 0;

  // Loop through all of the edges to compute the move vector the edge applies
  // to it's connected nodes.
  if (board.gather) {
    // Compute the bounding box of the pieces
    let minX = Number.MAX_SAFE_INTEGER,
      minY = Number.MAX_SAFE_INTEGER,
      maxX = Number.MIN_SAFE_INTEGER,
      maxY = Number.MIN_SAFE_INTEGER;

    for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
      const node = nodes[i];
      if (!node) continue;
      const { 0: x, 1: y } = node.cell;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    // Get the center of the bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const center: Vec2 = [centerX, centerY];

    // Make each node's move be twoard the gather point
    for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
      const node = nodes[i];
      if (!node) continue;
      subtract2(center, node.cell, node.move);
    }
  } else {
    for (let i = 0, iMax = edges.length; i < iMax; ++i) {
      const edge = edges[i];
      // Get the source to target vector
      const move = subtract2(edge.target.cell, edge.source.cell);
      // Apply the move value to the source
      add2(edge.source.move, move, edge.source.move);
      // Apply the reverse move value to the target
      add2(edge.target.move, scale2(move, -1, edge.target.move));
    }
  }

  // With all of the movement vector calculated we can now assign a power level
  // to the desired movement of the node as well as a direction for the node to
  // move.
  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];
    const { 0: dx, 1: dy } = node.move;

    // We need to determine the cell this node wishes to occupy.
    const direction: Vec2 = [0, 0];

    if (dx < 0) direction[0]--;
    if (dx > 0) direction[0]++;
    if (dy < 0) direction[1]--;
    if (dy > 0) direction[1]++;

    node.moveDir = direction;
    if (board.gather) node.power = 1;
    else node.power = dx * dx + dy * dy;
  }

  const resolved = new Set<any>();

  const getCell = (cell: Vec2) => {
    let row = board.cells[cell[0]];
    if (!row) return void 0;
    return row[cell[1]];
  };

  const resolveNode = (node: IGamePiece<TNodeMeta, TEdgeMeta>) => {
    resolved.add(node);
    node.move = [0, 0];
    if (node.inertia <= 0) node.momentum = [0, 0];
    else node.inertia--;
  };

  let pickCell: Vec2 = [0, 0];
  let tempVec2: Vec2 = [0, 0];
  let moveSideDir: Vec2 = [0, 0];

  for (let i = 0, iMax = nodes.length; i < iMax; ++i) {
    const node = nodes[i];
    if (resolved.has(node)) continue;
    add2(node.cell, node.moveDir, pickCell);
    let targetNode = getCell(pickCell);

    // If empty, occupy the cell.
    if (!targetNode) {
      let seek = 0;

      // Move until we have found a non-empty cell
      while (seek--) {
        add2(pickCell, node.moveDir, tempVec2);
        if (getCell(tempVec2)) break;
        copy2(tempVec2, pickCell);
      }

      // If the node to move to is the same node as the previous move of the
      // node, we disallow it.
      if (compare2(node.momentum, pickCell)) {
        resolveNode(node);
      } else {
        placeNodeAt(board, void 0, node.cell);
        placeNodeAt(board, node, pickCell);
        resolveNode(node);
      }

      continue;
    }

    // The next steps means the node could not freely occupy a space so the
    // game's tension increases.
    board.tension++;

    // If the target cell is occupied, we battle out the current node's power vs
    // the target node's power. The target node's power is modified based on
    // comparing the target node's move direction vs this node's move direction.
    //
    // if both move directions are the same: the target node gets a modifer of 1
    // if they mismatch, there is a power modifer less than one depending on the
    // degree of mismatch. The degree of mismatch is based on the 8 possible
    // directions of node swap.
    //
    const powerModifier = determinePowerModifier(
      node.moveDir,
      targetNode.moveDir
    );

    if (node.power > targetNode.power * powerModifier) {
      placeNodeAt(board, targetNode, node.cell);
      placeNodeAt(board, node, pickCell);
      resolveNode(node);
      resolveNode(targetNode);
      continue;
    }

    // If the node fails to win the cell location, the node can see if an
    // appropriate side cell is available to move to along a single axis of
    // movement by zeroing out the other axis of movement.
    else {
      moveSideDir[0] = node.moveDir[0];
      moveSideDir[1] = 0;
      add2(node.cell, moveSideDir, pickCell);
      targetNode = targetNode = getCell(pickCell);

      if (!targetNode) {
        placeNodeAt(board, void 0, node.cell);
        placeNodeAt(board, node, pickCell);
        resolveNode(node);
        continue;
      }

      moveSideDir[0] = 0;
      moveSideDir[1] = node.moveDir[1];
      add2(node.cell, moveSideDir, pickCell);
      targetNode = getCell(pickCell);

      if (!targetNode) {
        // If the node to move to is the same node as the previous move of the
        // node, we disallow it.
        if (compare2(node.momentum, pickCell)) {
          resolveNode(node);
        } else {
          placeNodeAt(board, void 0, node.cell);
          placeNodeAt(board, node, pickCell);
          resolveNode(node);
        }
        continue;
      }

      // If node still fails to move a bit. We allow the node to move
      // perpendicular to it's move direction to an empty cell. We allow
      // perpendicular movement selection only one way, but we alternate which
      // way can be picked based on every other cell so a long line of nodes
      // won't pick the same direction and attempt greater spacing.
      moveSideDir[0] = node.moveDir[1];
      moveSideDir[1] = node.moveDir[0];

      if (moveSideDir[0] !== 0)
        if (node.cell[1] % 2 === 0) moveSideDir[1] *= -1;
      if (moveSideDir[1] !== 0)
        if (node.cell[0] % 2 === 0) moveSideDir[1] *= -1;
      add2(node.cell, moveSideDir, pickCell);
      targetNode = getCell(pickCell);

      if (!targetNode) {
        // If the node to move to is the same node as the previous move of the
        // node, we disallow it.
        if (compare2(node.momentum, pickCell)) {
          resolveNode(node);
        } else {
          placeNodeAt(board, void 0, node.cell);
          placeNodeAt(board, node, pickCell);
          resolveNode(node);
        }
        continue;
      }
    }
  }

  // Disable board gather mode every frame
  board.gather = false;

  if (options.onLayoutUpdate) {
    await convertCellsToCoordinates(pieces, board, options);
  }
}

/**
 * This lays out nodes and edges based on game rules to compete for a cell. This
 * is to mimick the ideals of force directed graphs by attempting to get
 * relative spacing between nodes and edges, but simplifies the computations of
 * charges down to rule sets that let's the node's and edges duke it out over
 * occupation of cells.
 *
 * This strategy may introduce some very interesting consequences of easily
 * extending to 3D layouts and can introduce game board mechanics to further
 * analyze the game, such as, flood fills and grouping strategies. Rules can
 * even be introduced to encourage spacing between clusters, or perhaps not be
 * used at all.
 */
export async function gridGameLayout<TNodeMeta, TEdgeMeta>(
  network: INetworkData<TNodeMeta, TEdgeMeta>,
  options: IGridGameOptions<TNodeMeta, TEdgeMeta>
): Promise<IGridGameLayoutResult<TNodeMeta, TEdgeMeta>> {
  // Create all of the pieces that will play in the game simulation
  const pieces = generatePieces(network);
  // Create the game space for our pieces to playz
  const board = generateBoard(pieces, options);
  // Set our pieces on ze board
  beginNodeLayout(pieces, board);

  // Inform the layout has been initialized with all the nodes
  if (options.onLayoutBegin) {
    await convertCellsToCoordinates(pieces, board, options, false);
    options.onLayoutBegin?.({
      nodes: pieces.nodes,
      nodeById: new Map(),
      edges: pieces.edges,
    });
  }

  // Run the simulation for a bit.
  let steps = options.steps || 1000;
  // Start by adding some space to the pieces
  await spreadPieces(board, pieces, options, 2);
  // Inform of initial render
  await convertCellsToCoordinates(pieces, board, options);

  const triggers = {
    spread: 0,
    compress: 0,
    gather: 0,
  };

  while (steps === -1 || steps-- > 0) {
    const gathering = board.gather;

    if (steps === 100) {
      await removeEmptyRowsAndColumns(board, pieces);
    }

    // Play the game to resolve
    await playGame(board, pieces, options);

    if (board.tension / pieces.nodes.length > 0.8 && !gathering) {
      console.log("TENSION", board.tension / pieces.nodes.length);
      await spreadPieces(board, pieces, options, 8);
      await driftPieces(board, pieces);

      if (options.onLayoutUpdate) {
        await convertCellsToCoordinates(pieces, board, options);
      }
    }

    if (options.quitTrigger?.()) {
      return {
        nodes: pieces.nodes,
        nodeById: new Map(),
        edges: pieces.edges,
      };
    }

    const shouldSpread = options.spreadTrigger?.();

    if (shouldSpread) {
      if (triggers.spread !== shouldSpread.trigger) {
        triggers.spread = shouldSpread.trigger;
        await spreadPieces(board, pieces, options, shouldSpread.spread);
        await driftPieces(board, pieces);
      }
    }

    const shouldCompress = options.compressTrigger?.();

    if (shouldCompress) {
      if (triggers.compress !== shouldCompress) {
        triggers.compress = shouldCompress;
        await removeEmptyRowsAndColumns(board, pieces);
        await driftPieces(board, pieces);
      }
    }

    const shouldGather = options.gatherTrigger?.();

    if (shouldGather) {
      if (triggers.gather !== shouldGather) {
        triggers.gather = shouldGather;
        board.gather = true;
      }
    }
  }

  // Give a final spread to the pieces to make the connections clearer
  await spreadPieces(board, pieces, options, 2);
  // Final step, we convert the cells to actual coordinates for rendering
  await convertCellsToCoordinates(pieces, board, options);

  return {
    nodes: pieces.nodes,
    nodeById: new Map(),
    edges: pieces.edges,
  };
}
