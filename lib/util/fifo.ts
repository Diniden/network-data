export class FIFO<T> {
  /** Keep a list that blocks out chunks of memory for use */
  list = new Array<T>(10000);
  index = 0;
  next = -1;
  length = 0;

  in(vals: T | T[]) {
    vals = Array.isArray(vals) ? vals : [vals];
    for (let i = 0, max = vals.length; i < max; ++i) {
      if (this.index === this.list.length) {
        // Same virtual length as real length, we need a longer list in memory
        if (this.length === this.list.length) {
          this.list = this.list.concat(new Array(10000));
        }

        // Otherwise, we just consolidate our list by removing the undefineds
        else {
          let toFill = 0;
          for (let i = 0, max = this.list.length; i < max; ++i) {
            const item = this.list[i];
            if (item !== (void 0)) {
              delete this.list[i];
              this.list[toFill] = item;
              ++toFill;
            }
          }

          this.index = toFill;
          this.next = -1;
        }
      }

      this.list[this.index] = vals[i];
      ++this.index;
      ++this.length;
    }

    return this.length;
  }

  out() {
    --this.length;
    const item = this.list[++this.next];
    delete this.list[this.next];

    return item;
  }
}
