import { Vec2 } from "deltav";
import {
  aabbContains,
  aabbIntersect,
  aabbIntersectsPoint,
  aabbToQuad,
  IAABB,
} from "./aabb";

/** Number of children this node can handle before it subdivides */
const maxPopulation = 4;

/**
 * Generates a Quad tree node with the provided bounds. AABB objects can be
 * added to this tree and will be stored in the appropriate quadrant. Each entry
 * should provide all collision pairs.
 */
class Node<TAABB extends IAABB> {
  /** The bounding region of this node */
  bounds: IAABB;
  /** The quadrants of this node if the node is subdivided */
  quadrants: {
    tl: Node<TAABB>;
    tr: Node<TAABB>;
    bl: Node<TAABB>;
    br: Node<TAABB>;
  };
  /** Indicates if this node is subdivided or not */
  isLeaf: boolean = true;
  /** The AABB objects contained within this node */
  entries: TAABB[] = [];

  constructor(bounds: IAABB) {
    this.bounds = bounds;
  }

  /**
   * Inserts a new AABB object into the tree at this node. If this node is a
   * leaf, it will add the object to the list of objects until max population is
   * reached. Once max population is reached, this node will subdivide and
   * re-add all of it's existing children so the children will be placed in the
   * appropriate quadrant. If an AABB object is not completely contained within
   * a quadrant, it will be placed in the parent node.
   */
  add(entry: TAABB, collisions?: TAABB[]) {
    if (this.isLeaf) {
      this.entries.push(entry);

      if (this.entries.length > maxPopulation) {
        this.subdivide(entry, collisions);
      }
    } else {
      this.addEntryToQuadrant(entry, collisions);
    }

    // After insertion, our entries for this node should be settled and we can
    // perform collision checks
    if (collisions) {
      for (let i = 0, iMax = this.entries.length; i < iMax; ++i) {
        const aabb = this.entries[i];

        if (aabbIntersect(entry, aabb)) {
          collisions.push(aabb);
        }
      }
    }
  }

  /**
   * Performs the actual insertion of an AABB object into the appropriate
   * quadrant. If the AABB object is not completely contained within a quadrant,
   * it will be placed in the parent node.
   */
  addEntryToQuadrant(entry: TAABB, collisions?: TAABB[]) {
    if (aabbContains(this.quadrants.tl.bounds, entry)) {
      this.quadrants.tl.add(entry, collisions);
    } else if (aabbContains(this.quadrants.tr.bounds, entry)) {
      this.quadrants.tr.add(entry, collisions);
    } else if (aabbContains(this.quadrants.bl.bounds, entry)) {
      this.quadrants.bl.add(entry, collisions);
    } else if (aabbContains(this.quadrants.br.bounds, entry)) {
      this.quadrants.br.add(entry, collisions);
    } else {
      this.entries.push(entry);
    }
  }

  /**
   * Subdivides this node into four quadrants and re-adds all of the existing
   * children to the appropriate quadrant.
   */
  subdivide(entry: TAABB, collisions?: TAABB[]) {
    this.isLeaf = false;
    const quadrants = aabbToQuad(this.bounds);
    this.quadrants = {
      tl: new Node(quadrants.tl),
      tr: new Node(quadrants.tr),
      bl: new Node(quadrants.bl),
      br: new Node(quadrants.br),
    };
    const readd = this.entries;
    this.entries = [];

    for (let i = 0, iMax = readd.length; i < iMax; ++i) {
      const node = readd[i];
      this.addEntryToQuadrant(node, node === entry ? collisions : void 0);
    }
  }

  /**
   * This queries a point to see which AABB entries the point intersects.
   */
  queryPoint(point: Vec2, collisions?: TAABB[]) {
    collisions = collisions || [];

    if (this.quadrants) {
      if (aabbIntersectsPoint(this.quadrants.tl.bounds, point)) {
        this.quadrants.tl.queryPoint(point, collisions);
      } else if (aabbIntersectsPoint(this.quadrants.tr.bounds, point)) {
        this.quadrants.tr.queryPoint(point, collisions);
      } else if (aabbIntersectsPoint(this.quadrants.bl.bounds, point)) {
        this.quadrants.bl.queryPoint(point, collisions);
      } else if (aabbIntersectsPoint(this.quadrants.br.bounds, point)) {
        this.quadrants.br.queryPoint(point, collisions);
      }
    }

    // If we reached this node, then all entries for this node need to be tested
    // against the point
    for (let i = 0, iMax = this.entries.length; i < iMax; ++i) {
      const aabb = this.entries[i];

      if (aabbIntersectsPoint(aabb, point)) {
        collisions.push(aabb);
      }
    }

    return collisions;
  }
}

/** Alias the node as a quad tree */
export const QuadTree = Node;
