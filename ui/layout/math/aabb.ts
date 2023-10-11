import { Vec2 } from "deltav";

export interface IAABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generates an AABB object from min and max bounds.
 */
export function aabbFromMinMax(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): IAABB {
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Checks if two AABB intersect with each other.
 */
export function aabbIntersect(a: IAABB, b: IAABB) {
  if (a.x > b.x + b.width) return false;
  if (a.x + a.width < b.x) return false;
  if (a.y > b.y + b.height) return false;
  if (a.y + a.height < b.y) return false;
  return true;
}

/**
 * Checks if a point is within an AABB.
 */
export function aabbIntersectsPoint(a: IAABB, p: Vec2) {
  if (p[0] < a.x) return false;
  if (p[0] > a.x + a.width) return false;
  if (p[1] < a.y) return false;
  if (p[1] > a.y + a.height) return false;
  return true;
}

/**
 * Divides an AABB into four AABBs representing each quadrant
 */
export function aabbToQuad(aabb: IAABB) {
  const halfWidth = aabb.width / 2;
  const halfHeight = aabb.height / 2;
  const x = aabb.x;
  const y = aabb.y;

  return {
    tl: { x, y, width: halfWidth, height: halfHeight },
    tr: { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
    bl: { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
    br: {
      x: x + halfWidth,
      y: y + halfHeight,
      width: halfWidth,
      height: halfHeight,
    },
  };
}

/**
 * Checks if a container AABB completely contains a target AABB where no part of
 * the target is outside of the container.
 */
export function aabbContains(container: IAABB, contains: IAABB) {
  return (
    container.x <= contains.x &&
    container.y <= contains.y &&
    container.x + container.width >= contains.x + contains.width &&
    container.y + container.height >= contains.y + contains.height
  );
}

/**
 * Generates an AABB from a cluster of points.
 */
export function aabbEncapsulatePoints(points: { x: number; y: number }[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; ++i) {
    const point = points[i];
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return aabbFromMinMax(minX, minY, maxX, maxY);
}

/**
 * Generates an AABB from a cluster of Vec2s.
 */
export function aabbEncapsulateVec2s(points: Vec2[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; ++i) {
    const point = points[i];
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }

  return aabbFromMinMax(minX, minY, maxX, maxY);
}
