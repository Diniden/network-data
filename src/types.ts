/**
 * A numerical expression of value or values for metrics within the network data
 */
export type Weights = number | number[];

/**
 * Typeguard to ensure value is a Weights type.
 */
export function isWeights(val: any): val is Weights {
  return val && (val.toFixed || Array.isArray(val));
}

/**
 * This is the expected value that an identifier should be. Number identifiers perform better.
 */
export type Identifier = number | string;

/**
 * Typeguard to ensure a value is an identifier
 */
export function isIdentifier(val: any): val is Identifier {
  return val && (val.toFixed || val.substring);
}

/**
 * Typeguard for identifiers to determine if it's a string or not
 */
export function isIdentifierString(val: Identifier): val is string {
  return Boolean((val as any).substring);
}

/**
 * Defines a method or string accessor to retrieve a property
 */
export type Accessor<TSource, TReturn> =
  | ((item: TSource) => TReturn)
  | keyof TSource;

/**
 * Typeguard for Accessors to determine if it's a simple string access or the method access
 */
export function isAccessorString<T, U>(val: Accessor<T, U>): val is keyof T {
  return Boolean((val as any).substring);
}

/**
 * An edge represents a path between two nodes and can express value to either direction the edge flows.
 * An edge requires nodes to exist.
 */
export interface IEdge<TNodeMeta, TEdgeMeta> {
  /** A unique identifier for the edge. A number is preferred for performance and reduced RAM */
  id: Identifier;
  /** One of the nodes the edge connects */
  a: INode<TNodeMeta, TEdgeMeta>;
  /** Another node the edge can connect */
  b: INode<TNodeMeta, TEdgeMeta>;
  /** The value flowing from node a to node b */
  atob: Weights;
  /** The value flowing from node b to node a */
  btoa: Weights;
  /** Meta information that can be associated with the Edge */
  meta?: TEdgeMeta;
}

/**
 * A node represents a data point with a distinct value that can exist as itself that can be connected to other nodes.
 */
export interface INode<TNodeMeta, TEdgeMeta> {
  /** A unique identifier for the node. A number is preferred for performance and reduced RAM */
  id: Identifier;
  /** The edges that connects this node to other nodes where edge.b === this node */
  in: IEdge<TNodeMeta, TEdgeMeta>[];
  /** Meta information that can be associated with the Node */
  meta?: TNodeMeta;
  /** The edges that connects this node to other nodes where edge.a === this node */
  out: IEdge<TNodeMeta, TEdgeMeta>[];
  /** The values that this node harbors */
  value: Weights;
}

/**
 * This is the proper data structure for Networked Data.
 */
export interface INetworkData<TNodeMeta, TEdgeMeta> {
  /** The new node format created for all of the node information */
  nodes: INode<TNodeMeta, TEdgeMeta>[];
  /** The lookup used to identify nodes by their identifier */
  nodeMap: Map<Identifier, INode<TNodeMeta, TEdgeMeta>>;
  /** The new edge format created for all of the edge information */
  edges: IEdge<TNodeMeta, TEdgeMeta>[];
  /** The lookup used to identify edges by their identifier */
  edgeMap: Map<Identifier, IEdge<TNodeMeta, TEdgeMeta>>;
  /**
   * This is a lookup to quickly find existing connections. This only maps unidirectionally where you always have to
   * check a to b. Checking b to a would be considered undefined behavior.
   */
  atobMap: Map<
    INode<TNodeMeta, TEdgeMeta>,
    Map<INode<TNodeMeta, TEdgeMeta>, IEdge<TNodeMeta, TEdgeMeta>>
  >;
}
