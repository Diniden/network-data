/**
 * This represents the Connected Component Labeling algorithm
 *
 * Discussion and implementation found here
 *
 * http://stackoverflow.com/questions/14465297/connected-component-labelling
 * https://en.wikipedia.org/wiki/Connected-component_labeling
 *
 */
export class ConnectedComponentLabeling {
  colCount: number = 0;
  label: number[][] = [];
  labels: any = {};
  m: number[][];
  rowCount: number = 0;

  /**
   * Creates a new Connected component labeling algorithm
   */
  constructor(data: number[][]) {
    this.rowCount = data.length;
    this.colCount = (data[0] || []).length;
    this.m = data;

    for (let i = 0; i < this.rowCount; ++i) {
      this.label[i] = [];
    }
  }

  /**
   * Helper function for performing the bulk of the algorithms process
   */
  dfs(
    x: number,
    y: number,
    currentLabel: number,
    rowCount: number,
    colCount: number,
    dfs: any,
    label: any,
    labels: any,
    m: any
  ) {
    if (
      x < 0 ||
      x === colCount || // Out of bounds
      y < 0 ||
      y === rowCount || // Out of bounds
      label[x][y] ||
      !m[x][y] // Already labeled or not marked with 1 in m
    ) {
      return;
    }

    // Mark the current cell
    label[x][y] = currentLabel;
    labels[currentLabel] = true;

    dfs(x + 1, y, currentLabel, rowCount, colCount, dfs, label, labels, m);
    dfs(x, y + 1, currentLabel, rowCount, colCount, dfs, label, labels, m);
    dfs(x - 1, y, currentLabel, rowCount, colCount, dfs, label, labels, m);
    dfs(x, y - 1, currentLabel, rowCount, colCount, dfs, label, labels, m);
  }

  /**
   * Executes the algorithm on the input data. It will apply a label matching the input dimensions
   *
   * so if you have 2d input data, you will have label filled with the same dimensions but each cell
   * will have a label showing the grouping the item belongs to
   */
  findComponents() {
    let component: number = 0;
    const colCount = this.m.length;
    const rowCount = (this.m[0] || []).length;

    const m = this.m;
    const label = this.label;
    const labels = this.labels;
    const dfs = this.dfs;
    let ref1, ref2;

    for (let x = 0; x < colCount; ++x) {
      // Column references to reduce lookups
      ref1 = label[x];
      ref2 = m[x];

      for (let y = 0; y < rowCount; ++y) {
        if (!ref1[y] && ref2[y]) {
          dfs(x, y, ++component, rowCount, colCount, dfs, label, labels, m);
        }
      }
    }
  }

  getLabels() {
    const lbls = [];

    for (const key in this.labels) {
      if (this.labels.hasOwnProperty(key)) {
        lbls.push(key);
      }
    }

    return lbls;
  }
}
