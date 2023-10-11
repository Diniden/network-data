import { Vec2 } from "deltav";
import { aabbEncapsulateVec2s, IAABB } from "./aabb";
import { Density } from "./density";
import { QuadTree } from "./quad-tree";

export interface IDensityRegionResult {
  /**
   * The associated cluster for the input point. This is a parallel list to the
   * input points list. If the entry is undefined/void, then the point is not
   * associated with any cluster.
   */
  results: (IAABB | void)[];
  /** All clusters detected with point data */
  regions: Set<IAABB>;
}

/**
 * This computes density regions and finds an appropriate density group each
 * point should be associated with.
 *
 * This outputs a list of IAABBs that represents the area of the density
 * associated with the node. If two nodes share the same IAABB, then they are
 * within the same cluster.
 */
export function densityRegions(
  points: Vec2[],
  hintBounds?: IAABB
): IDensityRegionResult {
  const allContours: Vec2[][] = [];
  const CONTOUR_LIMIT = 25;
  // const maxContours = Number.MIN_SAFE_INTEGER;
  let bounds = hintBounds;

  if (!bounds) {
    bounds = aabbEncapsulateVec2s(points);
  }

  const { width, height } = bounds;

  // Compute a large array of varying contours encompassing regions of points
  for (let x = 1; x < CONTOUR_LIMIT; ++x) {
    for (let y = 1; y < CONTOUR_LIMIT; ++y) {
      const resolutionX = Math.ceil(width / (15 * x));
      const resolutionY = Math.ceil(height / (15 * y));

      for (let k = 2; k < CONTOUR_LIMIT * 2; k += 2) {
        const density = new Density();
        const contours = density.getSpikeRegions(
          points,
          [k],
          resolutionX,
          resolutionY
        );

        // Concatenate all density regions found
        Object.keys(contours).forEach((key: string) => {
          // Filter out any contour that may not have any points in it
          if (contours[key].length) {
            allContours.push(contours[key]);
          }
        });
      }
    }
  }

  // We now convert our contours into AABBs so we can efficiently compute which
  // points belong to which contour
  const contourAABBs: IAABB[] = allContours.map(aabbEncapsulateVec2s);
  // With AABB objects we can use a quad tree to speed up the processing of each
  // point, to find which contours our point intesects with
  const quadTree = new QuadTree(bounds);
  for (let i = 0, iMax = contourAABBs.length; i < iMax; ++i) {
    quadTree.add(contourAABBs[i]);
  }

  // Store the resulting IAABBs in the same order of injected points.
  const results: (IAABB | void)[] = [];
  const regions = new Set<IAABB>();

  // Loop through all of our injected points and find the smallest contour that
  // is intersected with
  for (let i = 0, iMax = points.length; i < iMax; ++i) {
    const point = points[i];
    const hits = quadTree.queryPoint(point);
    // Loop through hits and find the result with the smallest area
    let smallestArea = Number.MAX_SAFE_INTEGER;
    let smallestAABB: IAABB | void;

    for (let k = 0, kMax = hits.length; k < kMax; ++k) {
      const aabb = hits[k];
      const area = aabb.width * aabb.height;

      if (area < smallestArea) {
        smallestArea = area;
        smallestAABB = aabb;
      }
    }

    results.push(smallestAABB);
    if (smallestAABB) regions.add(smallestAABB);
  }

  return {
    results,
    regions,
  };
}
