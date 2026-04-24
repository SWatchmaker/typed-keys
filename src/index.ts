/**
 * @swatchmaker/typed-keys
 *
 * A type-safe key builder for TypeScript with full autocomplete and runtime validation.
 *
 * @example
 * ```typescript
 * import { defineBuilder } from '@swatchmaker/typed-keys';
 *
 * const KeyBuilder = defineBuilder([
 *   { name: 'org', params: ['string'], parent: null },
 *   { name: 'courts', params: ['string'], parent: 'org' },
 *   { name: 'occupancy', params: ['Date', 'Date'], parent: 'courts' }
 * ] as const);
 *
 * const key = KeyBuilder.create()
 *   .org('org-123')
 *   .courts('court-456')
 *   .occupancy(new Date('2024-01-01'), new Date('2024-01-07'))
 *   .build();
 * // Result: "org:org-123:courts:court-456:occupancy:2024-01-01T00:00:00.000Z-2024-01-07T00:00:00.000Z"
 *
 * // Compile-time: TypeScript shows autocomplete for valid methods only
 * // Runtime: Clear error messages for invalid chains
 * ```
 *
 * Features:
 * - Full TypeScript autocomplete at every step
 * - Compile-time error detection for invalid chains
 * - Runtime validation with descriptive error messages
 * - Support for native types: string, number, Date (auto-cast to string)
 * - Custom formatters for complex key segments
 * - Maximum 10 levels (prevents TypeScript recursion issues)
 * - Immutable builder instances (reusable partial builders)
 */

// Main API
export { defineBuilder } from './builder.js';

// Types for advanced usage
export type {
  ChainState,
  LevelDef,
  NativeParam,
  ParamType,
  ParseParams,
  LevelNames,
  AvailableLevels,
  CanExtend,
  BuildMethod,
  Builder,
  BuilderConstructor,
} from './types.js';
