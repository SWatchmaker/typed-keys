import type {
  LevelDef,
  BuilderConstructor,
  NativeParam,
  ChainState,
} from './types.js';

/**
 * Internal builder implementation with runtime validation.
 * Works with the type system to provide both compile-time and runtime safety.
 */
class TypedBuilderImpl<const S extends readonly LevelDef<any, any, any>[]> {
  private readonly _schema: S;
  private readonly _state: ChainState;
  private readonly _parts: string[];

  constructor(schema: S, state: ChainState = [], parts: string[] = []) {
    this._schema = schema;
    this._state = state;
    this._parts = parts;
  }

  /**
   * Cast native parameter to string.
   * - Dates: converted to ISO string
   * - Numbers: converted to string
   * - Strings: passed through
   */
  private castToString(value: NativeParam): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }

  /**
   * Get the unique ID for a level (explicit id or name).
   */
  private getLevelId(level: LevelDef<any, any, any>): string {
    return level.id ?? level.name;
  }

  /**
   * Create a method for a specific level.
   */
  private createLevelMethod(level: LevelDef<any, any, any>) {
    return (...args: NativeParam[]) => {
      // Validate parameter count
      if (args.length !== level.params.length) {
        throw new Error(
          `Level '${this.getLevelId(level)}' expects ${level.params.length} parameters, got ${args.length}`,
        );
      }

      // Format the key segment
      // Priority: 1) custom format, 2) level name if no params, 3) join args
      let formatted: string;
      if (level.format) {
        formatted = level.format(...args);
      } else if (level.params.length === 0) {
        // When no params and no custom format, use level name as segment
        formatted = level.name;
      } else {
        formatted = args.map((arg) => this.castToString(arg)).join(':');
      }

      // Create new builder instance with extended state (use ID, not name)
      const levelId = this.getLevelId(level);
      const newState: ChainState = [...this._state, levelId];
      const newParts = [...this._parts, formatted];

      // Return new builder with updated state
      const newBuilder = new TypedBuilderImpl(this._schema, newState, newParts);
      return this.createProxy(newBuilder);
    };
  }

  /**
   * Build the final key string.
   */
  private build(): string {
    if (this._parts.length === 0) {
      throw new Error('Cannot build empty key. Add at least one level first.');
    }
    return this._parts.join(':');
  }

  /**
   * Check if a level is available from current state.
   */
  private isLevelAvailable(level: LevelDef<any, any, any>): boolean {
    const parentId = level.parent;

    // Root level - available when chain is empty
    if (parentId === null) {
      return this._state.length === 0;
    }

    // Child level - available when parent ID is in chain (parent references the ID, not name)
    return this._state.includes(parentId);
  }

  /**
   * Create a proxy that exposes available methods based on current state.
   */
  private createProxy(builder: TypedBuilderImpl<S>): unknown {
    const availableLevels = builder._schema.filter((level) =>
      builder.isLevelAvailable(level),
    );

    // Create method lookup
    const methods: Record<string, (...args: NativeParam[]) => unknown> = {};
    for (const level of availableLevels) {
      methods[level.name] = builder.createLevelMethod(level);
    }

    // Return proxy with build method and available level methods
    return new Proxy(methods as object, {
      get: (target, prop: string) => {
        if (prop === 'build') {
          // Only provide build when chain has at least one level
          if (builder._state.length === 0) {
            return undefined;
          }
          return () => builder.build();
        }

        const method = target[prop as keyof typeof target];
        if (method) {
          return method;
        }

        // Get available level IDs for error message
        const availableIds = availableLevels.map((l) => builder.getLevelId(l));

        // Runtime error for invalid method access
        if (builder._state.length === 0) {
          throw new Error(
            `Method '${prop}' is not available. ` +
              `Available root levels: ${availableIds.join(', ')}`,
          );
        } else {
          throw new Error(
            `Method '${prop}' is not available from current chain state [${builder._state.join(' → ')}]. ` +
              `Available next levels: ${availableIds.join(', ')}`,
          );
        }
      },
    });
  }

  /**
   * Create initial builder with empty state.
   */
  static create<S extends readonly LevelDef<any, any, any>[]>(
    schema: S,
  ): unknown {
    const builder = new TypedBuilderImpl(schema);
    return builder.createProxy(builder);
  }
}

/**
 * Get the ID for a level (id ?? name).
 */
function getLevelId(level: LevelDef<any, any, any>): string {
  return level.id ?? level.name;
}

/**
 * Validate schema at definition time.
 */
function validateSchema(
  schema: readonly LevelDef<any, any, any>[],
): void {
  // Check max depth
  if (schema.length > 10) {
    throw new Error(
      `Schema has ${schema.length} levels, but maximum is 10. ` +
        'Reduce the number of levels or split into multiple builders.',
    );
  }

  // Collect all IDs (explicit id or name)
  const ids = schema.map(getLevelId);

  // Check for duplicate IDs
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);
  }

  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    throw new Error(
      `Duplicate level IDs found: ${uniqueDuplicates.join(', ')}.\n` +
        `If you have levels with the same name, you must provide distinct 'id' fields:\n` +
        `Example: { name: 'courts', id: 'org-courts', parent: 'org', ... }\n` +
        `The 'parent' field should reference the 'id' (or name if no id) of the parent level.`
    );
  }

  // Check parent references (parent should reference an ID)
  const validIds = new Set(ids);
  for (const level of schema) {
    if (level.parent !== null) {
      if (!validIds.has(level.parent)) {
        throw new Error(
          `Level '${getLevelId(level)}' references unknown parent '${level.parent}'. ` +
            `Make sure to define a level with id/name '${level.parent}' before '${getLevelId(level)}'.\n` +
            `Valid parent IDs: ${[...validIds].join(', ')}`
        );
      }
    }
  }

  // Check for circular references (simplified check)
  for (const level of schema) {
    const levelId = getLevelId(level);
    if (level.parent !== null && level.parent === levelId) {
      throw new Error(
        `Level '${levelId}' cannot be its own parent. ` +
          'Circular references are not allowed.',
      );
    }
  }
}

/**
 * Define a typed key builder schema.
 *
 * @example
 * ```typescript
 * const KeyBuilder = defineBuilder([
 *   { name: 'org', params: ['string'], parent: null },
 *   { name: 'courts', params: ['string'], parent: 'org' },
 *   { name: 'occupancy', params: ['Date', 'Date'], parent: 'courts' }
 * ] as const);
 *
 * const key = KeyBuilder.create()
 *   .org('org-123')
 *   .courts('court-456')
 *   .occupancy(new Date(), new Date())
 *   .build();
 * ```
 */
export function defineBuilder<
  const S extends readonly LevelDef<any, any, any>[],
>(schema: S): BuilderConstructor<S> {
  // Runtime validation
  validateSchema(schema);

  return {
    create: () => TypedBuilderImpl.create(schema) as unknown as ReturnType<
      BuilderConstructor<S>['create']
    >,
  };
}

// Re-export types for consumers
export type { ChainState, LevelDef, NativeParam } from './types.js';
