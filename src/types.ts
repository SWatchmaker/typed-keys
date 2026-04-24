// Native parameter types that auto-cast to string
export type NativeParam = string | number | Date;

// Schema definition for a single level in the builder chain
export type LevelDef<
  Name extends string,
  Params extends readonly string[],
  Parent extends string | null,
> = {
  readonly name: Name;
  readonly params: Params;
  readonly parent: Parent;
  readonly id?: string; // Optional unique identifier (defaults to name if not provided)
  readonly format?: (...args: NativeParam[]) => string;
};

// Chain state tracking - tuple of level IDs in order (id ?? name)
export type ChainState = readonly string[];

// Maximum chain depth to prevent TypeScript recursion issues
export type MaxDepth = 10;

// Map parameter type names to actual TypeScript types
export type ParamType<T extends string> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'Date'
      ? Date
      : never;

// Convert a tuple of type names to a tuple of actual types
// Uses conditional type to handle tuple preservation
export type ParseParams<T extends readonly string[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends string
    ? Rest extends readonly string[]
      ? [ParamType<First>, ...ParseParams<Rest>]
      : [ParamType<First>]
    : never
  : [];

// Extract level names from schema
export type LevelNames<S extends readonly LevelDef<any, any, any>[]> =
  S[number]['name'];

// Filter levels that are available from current chain state
export type AvailableLevels<
  S extends readonly LevelDef<any, any, any>[],
  CS extends ChainState,
> = CS extends []
  ? FilterByParent<S, null> // Root levels (parent is null)
  : FilterByParent<S, CS[number]>; // Child levels (parent matches any in chain)

// Helper: Filter levels by parent
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FilterByParent<
  S extends readonly LevelDef<any, any, any>[],
  P extends string | null,
> = S[number] extends infer L
  ? L extends LevelDef<any, any, any>
    ? L['parent'] extends P
      ? L
      : never
    : never
  : never;

// Check if chain can be extended (not at max depth)
export type CanExtend<CS extends ChainState> = CS['length'] extends MaxDepth
  ? false
  : true;

// Build method - only available when chain has at least one level
export type BuildMethod = {
  build(): string;
};

// Main builder type - recursive with depth tracking
export type Builder<
  S extends readonly LevelDef<any, any, any>[],
  CS extends ChainState = [],
> = CS extends []
  ? RootMethods<S, CS> // Empty chain - root levels only
  : CanExtend<CS> extends true
    ? ChainMethods<S, CS> // Can extend - show available children + build
    : TerminalMethods; // At max depth - build only

// Root methods - only levels with null parent
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RootMethods<
  S extends readonly LevelDef<any, any, any>[],
  CS extends ChainState,
> = {
  [K in AvailableLevels<S, CS> as K['name']]: (
    ...args: ParseParams<K['params']>
  ) => Builder<S, [...CS, K['name']]>;
};

// Chain methods - available children + build method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ChainMethods<
  S extends readonly LevelDef<any, any, any>[],
  CS extends ChainState,
> = BuildMethod & {
  [K in AvailableLevels<S, CS> as K['name']]: (
    ...args: ParseParams<K['params']>
  ) => Builder<S, [...CS, K['name']]>;
};

// Terminal methods - only build at max depth
type TerminalMethods = BuildMethod;

// Builder constructor type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type BuilderConstructor<S extends readonly LevelDef<any, any, any>[]> = {
  create(): Builder<S>;
};
