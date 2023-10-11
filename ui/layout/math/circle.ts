import { IAABB } from "./aabb";

export interface ICircle extends IAABB {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Tests if two circles intersect.
 */
export function circleIntersect(a: ICircle, b: ICircle) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const dr = a.r + b.r;
  return dx * dx + dy * dy < dr * dr;
}

/**
 * Distance between two circles
 */
export function circleDistanceSq(a: ICircle, b: ICircle) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  return dx * dx + dy * dy;
}

/**
 * Distance from cicle to point
 */
export function circleDistanceToPointSq(
  a: ICircle,
  b: { x: number; y: number }
) {
  const dx = b.x - a.cx;
  const dy = b.y - a.cy;
  return dx * dx + dy * dy;
}

/**
 * Generates a circle that completely encapsulates the provided AABB.
 */
export function circleEncapsulateAABB(aabb: IAABB): ICircle {
  const halfWidth = aabb.width / 2;
  const halfHeight = aabb.height / 2;
  const cx = aabb.x + halfWidth;
  const cy = aabb.y + halfHeight;
  const r = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);

  return { cx, cy, r, x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
}
