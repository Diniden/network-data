export interface ValuedObject {
  /** A name for the node. May not be unique */
  name: string;
  /** A date value on the node */
  dateMetric: Date;
  /** A numerical value on the node */
  numMetric: number;
  /** A string value on the node */
  strMetric: string;
  /** A guaranteed UID identifier */
  UID?: string | number;
}

export interface TestNode extends ValuedObject {

}

export interface TestEdge extends ValuedObject {
  /** Guaranteed to point to a Node's UID */
  UID_A?: string | number;
  /** Guaranteed to point to a Node's UID */
  UID_B?: string | number;
}
