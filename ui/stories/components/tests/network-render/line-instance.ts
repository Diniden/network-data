import { EdgeInstance, IEdgeInstanceOptions, makeObservable } from "deltav";

export class LineInstance extends EdgeInstance {
  constructor(options: IEdgeInstanceOptions) {
    super(options);
    makeObservable(this, LineInstance);
  }
}
