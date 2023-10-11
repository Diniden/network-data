import { Vec4 } from "deltav";

export interface ITestValuedObject {
  /** A name for the meta data. May not be unique */
  name: string;
  /** A date value on the node */
  dateMetric: Date;
  /** A numerical value on the node */
  numMetric: number;
  /** A string value on the node */
  strMetric: string;
  /** A guaranteed UID identifier */
  UID: string | number;
  /** A color value on the node */
  color: Vec4;
}

export type TestNode = ITestValuedObject;

export type TestEdge = ITestValuedObject & {
  /** Guaranteed to point to a Node's UID */
  UID_IN: string | number;
  /** Guaranteed to point to a Node's UID */
  UID_OUT: string | number;
};
