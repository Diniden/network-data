/* tslint:disable: no-bitwise */
import { ConnectedComponentLabeling } from "./grouping";

/**
 * This represents calculations required to find density regions within a set of 2d points.
 * We represent the calculations within an object as there is caching involved to make multiple
 * calls occur more efficiently.
 */
export class Density {
  cache: {
    density: [number, number][];
    isoCorners: number[][];
    labels: ConnectedComponentLabeling | null;
    topLeft: [number, number];
  } = {
    density: [],
    isoCorners: [],
    labels: null,
    topLeft: [0, 0],
  };

  /**
   * This function works to identify contour regions based on the density of the particles distribution
   *
   * @param points        The list of points to assess density
   * @param regionThresholds This provides a threshold for the regions generated.
   * @param resolutionX   The density algorithm partitions the space into distinct chunks then analyzes the chunks for peaks. The
   *                      default value is 10. A recommended minimum is 1 and the theoretical max is the x range of the
   *                      injected points.
   * @param resolutionY   The density algorithm partitions the space into distinct chunks then analyzes the chunks for peaks. The
   *                      default value is 10. A recommended minimum is 1 and the theoretical max is the y range of the
   *                      injected points.
   *
   * @return {number: Array<[number, number]>} This will return a map. The key is a unique label identifying a group of segments as a single contour.
   *                                           The value is an array of segments.
   *                                           TODO: This will become an array of clockwise sorted points
   */
  getSpikeRegions(
    points: [number, number][],
    regionThresholds: number[],
    resolutionX?: number,
    resolutionY?: number
  ) {
    // Make a look up for each axis
    let density: [number, number][] = [];
    const marchingCorners: number[][] = [];
    const isoCorners: number[][] = [];
    let p: [number, number] = [0, 0];
    let col: number = 0;
    let row: number = 0;
    let maxRow: number = -99999;
    let maxCol: number = -99999;
    let minRow: number = 99999;
    let minCol: number = 99999;
    let minX: number = 99999;
    let minY: number = 99999;
    const floor: Function = Math.floor;

    let ref1, ref2;

    resolutionX = resolutionX || 10;
    resolutionY = resolutionY || 10;

    // Get the minimum values of the points so we can ensure everything is shifted into a positive grid
    for (let i = points.length - 1; i >= 0; --i) {
      p = points[i];
      if (p[0] < minX) {
        minX = p[0];
      }
      if (p[1] < minY) {
        minY = p[1];
      }
    }

    // We calculate a shifting factor to account for the range of values
    // going negative. All columns and rows must be positive values
    let colShift = 0;
    let rowShift = 0;

    if (minX < 0) {
      colShift = floor(-minX / resolutionX) + 1;
    }
    if (minY < 0) {
      rowShift = floor(-minY / resolutionY) + 1;
    }

    // We may have our marching squares resolution, but we want each corner to test within a different
    // sized sampling area. So, each corner will represent a small square, but it will test against points
    // in a wider area.

    // Make a density map
    for (let i = points.length - 1; i >= 0; --i) {
      p = points[i];
      col = floor(p[0] / resolutionX) + colShift;
      row = floor(p[1] / resolutionY) + rowShift;

      ref1 = density[col] = density[col] || [0, 0];
      ref1[row] = (ref1[row] || 0) + 1;

      // Find the bounds of our map
      if (col > maxCol) {
        maxCol = col;
      } else if (col < minCol) {
        minCol = col;
      }
      if (row > maxRow) {
        maxRow = row;
      } else if (row < minRow) {
        minRow = row;
      }
    }

    let tl, tr, bl, br;
    let l, t, val;
    let cornerRef: number[], isoRef: number[];
    const threshold = regionThresholds[0];
    const colRange = maxCol - minCol;
    const rowRange = maxRow - minRow;

    density = density.slice(minCol, maxCol);
    density.map((col) => col.slice(minRow, maxRow));

    this.cache.density = density;

    // Run through the corners of each cell in the density map
    for (let i = colRange; i >= 0; --i) {
      l = i - 1;
      cornerRef = marchingCorners[i] = [];
      isoRef = isoCorners[i] = [];
      ref1 = density[l];
      ref2 = density[i];

      for (let k = rowRange; k >= 0; --k) {
        t = k - 1;

        tl = (ref1 && ref1[t]) || 0;
        tr = (ref2 && ref2[t]) || 0;
        bl = (ref1 && ref1[k]) || 0;
        br = (ref2 && ref2[k]) || 0;

        // Get the value of the corner by averaging all density cells around it
        cornerRef[k] = val = tl + tr + bl + br;
        // Get the threshold reading for the corner
        isoRef[k] =
          tl > threshold || tr > threshold || bl > threshold || br > threshold
            ? 1
            : 0;
      }
    }

    this.cache.isoCorners = isoCorners;

    // Analyze the input and discover groups and apply labels to each group / component piece
    const grouping = new ConnectedComponentLabeling(isoCorners);
    grouping.findComponents();

    const labels = grouping.label;
    const uniqueLabels = grouping.getLabels();

    // We will add our segments based on which grouping the segment belongs to
    const segments: { [key: string]: [number, number][] } = {};
    // We will create a quick lookup to get the push function for a segment grouping
    // based on label as well.
    const add: { [key: string]: Function } = {};

    // Make sure we have an array initialized for each label
    uniqueLabels.forEach((lbl) => {
      const arr: any[] = (segments[lbl] = []);
      add[lbl] = arr.push.bind(arr);
    });

    // We want quick references to values that get re-calculated or re-looked up numerous times
    // per iteration
    let r, b, addSeg;

    // Precalculate half of the distance of one of the boxes
    const halfSqY = resolutionY / 2;
    const halfSqX = resolutionX / 2;

    this.cache.labels = grouping;

    // Examine squares to apply marching square draw types
    for (let col = isoCorners.length - 2; col >= 0; --col) {
      // Make column references to reduce look ups
      r = col + 1;
      ref1 = isoCorners[col];
      ref2 = isoCorners[r];

      for (let row = ref1.length - 2; row >= 0; --row) {
        val = 0;
        b = row + 1;
        // BL
        if (ref1[b]) {
          val = 1;
        }
        // BR
        if (ref2[b]) {
          val |= 0b0010;
        }
        // TR
        if (ref2[row]) {
          val |= 0b0100;
        }
        // TL
        if (ref1[row]) {
          val |= 0b1000;
        }

        switch (val) {
          /** No Segment */
          case 0b0000:
            break;

          /** Left, Bottom Segment */
          case 0b0001:
            addSeg = add[labels[col][b]];
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Right, Bottom Segment */
          case 0b0010:
            addSeg = add[labels[r][b]];
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Left, Right */
          case 0b0011:
            addSeg = add[labels[col][b]];
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Top, Right */
          case 0b0100:
            addSeg = add[labels[r][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Top, Left and Right, Bottom */
          case 0b0101:
            addSeg = add[labels[col][b]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);

            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Top, Bottom */
          case 0b0110:
            addSeg = add[labels[r][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Top, Left */
          case 0b0111:
            addSeg = add[labels[col][b]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Top, Left */
          case 0b1000:
            addSeg = add[labels[col][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Top, Bottom */
          case 0b1001:
            addSeg = add[labels[col][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Top, Right and Left, Bottom */
          case 0b1010:
            addSeg = add[labels[col][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);

            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Top, Right */
          case 0b1011:
            addSeg = add[labels[col][row]];
            // Top
            addSeg([col * resolutionX + halfSqX, row * resolutionY]);
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Left, Right */
          case 0b1100:
            addSeg = add[labels[col][row]];
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            break;

          /** Right, Bottom */
          case 0b1101:
            addSeg = add[labels[col][row]];
            // Right
            addSeg([r * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** Left, Bottom */
          case 0b1110:
            addSeg = add[labels[col][row]];
            // Left
            addSeg([col * resolutionX, row * resolutionY + halfSqY]);
            // Bottom
            addSeg([col * resolutionX + halfSqX, b * resolutionY]);
            break;

          /** No segment */
          case 0b1111:
            break;
          default:
            break;
        }
      }
    }

    colShift = -colShift * resolutionX;
    rowShift = -rowShift * resolutionY;

    this.cache.topLeft = [colShift, rowShift];

    for (const key in segments) {
      if (segments.hasOwnProperty(key)) {
        const a = segments[key];
        segments[key] = a.map((p) => [p[0] + colShift, p[1] + rowShift]);
      }
    }

    return segments;
  }
}
