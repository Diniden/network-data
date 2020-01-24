/**
 * This depicts all values that evaluate to false.
 */
export type Falsy = false | 0 | "" | null | undefined;

/**
 * This ensures a value is defined (does not use falsey so passes 0's and empty strings)
 */
export function isDefined<T>(val?: T | null): val is T {
  return !(val === void 0 || val === null);
}

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
 * Typeguard to ensure value is a single number and not a list
 */
export function isWeightNumber(val: Weights): val is number {
  return (val as number).toFixed !== void 0;
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
 * Defines a method or string accessor to retrieve a property. Accessors are also able to access multiples of the same
 * properties.
 */
export type Accessor<TSource, TReturn, TMeta> =
  | ((item: TSource, meta?: TMeta) => TReturn)
  | keyof TSource;

/**
 * Typeguard for Accessors to determine if it's a simple string access or the method access
 */
export function isAccessorString<T, U, V>(
  val: Accessor<T, U, V>
): val is keyof T {
  return Boolean((val as any).substring);
}

/**
 * This depicts a property that is able to provide rows of data. It depicts several strategies for providing that data.
 *
 * A simple list: All data is loaded and is ready to be provided. (Not recommended for large datasets as it loads ALL
 *                of the dataset into RAM to make this work)
 *
 * A simple callback: A row of data will be provided when the method is called. Allows for heavier processing and some
 *                    start up massaging of the data. (Not recommended for large datasets, it would be VERY tricky to
 *                    not have first loaded all of the initial data into RAM first to make this work)
 *
 * An async callback: A row of data will be provided when the method is called. This is allowed to have async patterns
 *                    as it returns a Promise rather than a value. This lets you fetch, process, massage the data as you
 *                    need before providing it. This is recommended for large datasets as it allows you to load in
 *                    pieces of unmassaged data into RAM and then forget about it as the system processes the provider.
 *
 * A Generator: A row of data will be provided from the generator per each next() call. Yields data rows, returns
 *              nothing, is passed in the index of the row being processed. (Not recommended for large datasets, it
 *              would be VERY tricky to not have first loaded all of the initial data into RAM first to make this work)
 *
 * An AsyncGenerator: A row of data will be provided from the generator per each next() call. Yields data rows, returns
 *                    nothing, is passed in the index of the row being processed. (This is a recommended approach for
 *                    large datasets as it can load in data piece by piece instead of all at once and be processed into
 *                    the target datatype withput having an intermediary type sitting around eating up ram)
 */
export type DataProvider<T> =
  | T[]
  | ((index: number) => T | Falsy)
  | ((index: number) => Promise<T>)
  | Generator<T, void, number>
  | AsyncGenerator<T, void, number>;

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
