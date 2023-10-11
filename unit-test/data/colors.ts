import { scaleThreshold } from "d3-scale";
import { Vec4 } from "deltav";

export function sunsetPalette(min: number, max: number) {
  const colors = [
    "#6fd658",
    "#ffd663",
    "#ffc565",
    "#ffb46f",
    "#ffa17c",
    "#ff8c8b",
    "#ff759d",
    "#ff57b1",
    "#ff34ab",
    "#ff1b49",
    "#26314E",
  ];
  const d = (max - min) / colors.length;

  return scaleThreshold()
    .range(colors.map(cssToNumber))
    .domain(colors.map((_, i) => min + d * (i + 1)));
}

export function bluePallette(min: number, max: number) {
  const d = (max - min) / 9;
  return scaleThreshold()
    .range(
      [
        "#001e3b",
        "#003655",
        "#054f70",
        "#2e678a",
        "#4b81a5",
        "#679bc0",
        "#83b6dd",
        "#9fd2fa",
        "#bef1ff",
      ].map(cssToNumber)
    )
    .domain([
      min + d * 1,
      min + d * 2,
      min + d * 3,
      min + d * 4,
      min + d * 5,
      min + d * 6,
      min + d * 7,
      min + d * 8,
    ]);
}

export function ensureDigits(val: string, digits: number) {
  return `${Array(digits).join("0")}${val}`.slice(-digits);
}

function cssToNumber(val: string) {
  return Number(val.replace("#", "0x"));
}

function numberToRGB(val: number): Vec4 {
  return [
    ((val >> 16) & 0xff) / 255,
    ((val >> 8) & 0xff) / 255,
    (val & 0xff) / 255,
    1,
  ];
}

/**
 * This retrieves the best contrasted viewed values that can be rendered for a
 * chart to indicate unique but related elements.
 */
export function getColorOptions(count: number, interleaved?: boolean) {
  // Map over to number values for easier processing
  // let out = SORTED_BASE_CHART_COLORS.slice(0).map(cssToNumber);
  const colorGen = sunsetPalette(0, count);
  const out = new Array(count).fill(0).map((_, i) => colorGen(i));

  if (interleaved) {
    // Take the values from each end of the array to interleave bright and dim
    // colors together
    const dark = out.slice(0, Math.floor(out.length / 2)).reverse();
    const bright = out.slice(Math.floor(out.length / 2)).reverse();

    const interleaved = [];

    for (let i = 0; i < dark.length; ++i) {
      interleaved.push(dark[i]);
      interleaved.push(bright[i]);
    }

    if (interleaved.length < out.length) {
      interleaved.push(bright[bright.length - 1]);
    }

    // Get our subset of colors we need for the chart
    return interleaved.map(numberToRGB).slice(0, count);
  }

  return out.map(numberToRGB).slice(0, count);
}
