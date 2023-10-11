export * from "./selection";
export * from "./calculate";
export * from "./data";
export * from "./types";
export * from "./util";

import * as calculate from "./calculate";
import * as data from "./data";
import * as selection from "./selection";
import * as util from "./util";

// Make the library easier to navigate by making the major defining sections objects which categorizes the types of
// functions available.
export const NetworkData = {
  Selection: selection,
  Calculate: calculate,
  Data: data,
  Util: util,
};
