# @swatchmaker/typed-keys

A type-safe key builder for TypeScript with full autocomplete and runtime validation. Useful for key-value stores, caching layers, and any system that uses structured keys.

## Features

- **🔒 Type Safety**: Full TypeScript autocomplete for valid chain sequences
- **🆔 Level IDs**: Support for duplicate level names with distinct IDs
- **🔄 Immutable**: Partial builders can be reused to create multiple keys
- **📦 Zero Dependencies**: Pure TypeScript implementation
- **🎯 Developer Experience**: Autocomplete shows only valid next methods
- **⚡ Runtime Performance**: Minimal overhead with efficient key generation
- **🛡️ Runtime Validation**: Clear error messages for invalid chains

## Installation

```bash
npm install @swatchmaker/typed-keys
# or
pnpm add @swatchmaker/typed-keys
# or
yarn add @swatchmaker/typed-keys
```

## Quick Start

```typescript
import { defineBuilder } from '@swatchmaker/typed-keys';

// Define your key hierarchy as a schema
const KeyBuilder = defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  { name: 'courts', params: ['string'], parent: 'org' },
  { name: 'occupancy', params: ['Date', 'Date'], parent: 'courts' }
] as const);

// Create keys with full type safety
const key = KeyBuilder.create()
  .org('org-123')
  .courts('court-456')
  .occupancy(new Date('2024-01-01'), new Date('2024-01-07'))
  .build();

// Result: "org-123:court-456:2024-01-01T00:00:00.000Z-2024-01-07T00:00:00.000Z"
```

## Schema Definition

Each level in the schema has these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | ✅ | Method name for this level |
| `params` | `string[]` | ✅ | Parameter types: `'string'`, `'number'`, `'Date'` |
| `parent` | `string \| null` | ✅ | Parent level ID (or `null` for root) |
| `id` | `string` | ❌ | Unique identifier (defaults to `name`) |
| `format` | `function` | ❌ | Custom formatter for key segment |

### Native Parameter Types

The following types are automatically cast to strings:

- **`string`**: Passed through as-is
- **`number`**: Converted via `String()`
- **`Date`**: Converted to ISO string via `.toISOString()`

```typescript
const KeyBuilder = defineBuilder([
  { name: 'range', params: ['number', 'number'], parent: null },
  { name: 'date', params: ['Date'], parent: null }
] as const);

// Numbers and dates are auto-cast
KeyBuilder.create().range(1, 100).build();  // "1:100"
KeyBuilder.create().date(new Date()).build(); // "2024-01-01T00:00:00.000Z"
```

## Level IDs for Duplicate Names

When you need multiple levels with the same name at different positions in the hierarchy, use the `id` field to distinguish them:

```typescript
const KeyBuilder = defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  // Two different 'courts' levels with distinct IDs
  { id: 'court-string', name: 'courts', params: ['string'], parent: 'org' },
  { id: 'court-number', name: 'courts', params: ['number'], parent: 'org' }
] as const);

// Both work because they have different IDs
const key1 = KeyBuilder.create().org('org-123').courts('court-a').build();
const key2 = KeyBuilder.create().org('org-456').courts(789).build();
```

**⚠️ Error on Duplicate IDs:**

If you define levels with the same name (and no explicit IDs), you'll get a helpful error:

```typescript
defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  { name: 'courts', params: ['string'], parent: 'org' },
  { name: 'courts', params: ['number'], parent: 'org' }  // ❌ Throws!
] as const);
// Error: Duplicate level IDs found: courts.
// If you have levels with the same name, you must provide distinct 'id' fields.
```

## Custom Formatters

Provide a custom `format` function to control how parameters are formatted into the key:

```typescript
const KeyBuilder = defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  {
    name: 'occupancy',
    params: ['Date', 'Date'],
    parent: 'org',
    format: (start, end) => 
      `occupancy:${formatDate(start)}-${formatDate(end)}`
  }
] as const);

const key = KeyBuilder.create()
  .org('org-123')
  .occupancy(new Date('2024-01-01'), new Date('2024-01-07'))
  .build();

// Result: "org-123:occupancy:01/01/2024-07/01/2024"
```

## Reusable Partial Builders

Build multiple keys efficiently by reusing partial builders:

```typescript
const base = KeyBuilder.create();
const orgBuilder = base.org('org-123'); // Reusable!

// Same org, different courts
const key1 = orgBuilder.courts('court-a').build();
const key2 = orgBuilder.courts('court-b').occupancy(d1, d2).build();

// Different org
const key3 = base.org('org-456').courts('court-c').build();
```

## Runtime Validation

The builder validates chains at runtime with clear error messages:

```typescript
const KeyBuilder = defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  { name: 'courts', params: ['string'], parent: 'org' }
] as const);

// ❌ Runtime Error: Method 'courts' is not available.
// Available root levels: org
KeyBuilder.create().courts('invalid');

// ❌ Runtime Error: Method 'invalid' is not available from current chain state [org].
// Available next levels: courts
KeyBuilder.create().org('org-123').invalid('test');
```

## Schema Validation

The `defineBuilder` function validates your schema at definition time:

- **Max 10 levels** - Prevents TypeScript recursion issues
- **Unique IDs** - Each level must have a unique ID (explicit or auto-generated from name)
- **Valid parent references** - Parent IDs must exist in the schema
- **No circular references** - A level cannot be its own parent

```typescript
// ❌ Error: Schema has 11 levels, but maximum is 10
defineBuilder([...11 levels]);

// ❌ Error: Duplicate level IDs found: courts
defineBuilder([...duplicate IDs]);

// ❌ Error: Level 'courts' references unknown parent 'nonexistent'
defineBuilder([...invalid parent]);
```

## Complex Example

```typescript
import { defineBuilder } from '@swatchmaker/typed-keys';

const KeyBuilder = defineBuilder([
  { name: 'org', params: ['string'], parent: null },
  { name: 'user', params: ['string'], parent: 'org' },
  { name: 'session', params: ['string'], parent: 'user' },
  { name: 'cache', params: ['string'], parent: 'session' }
] as const);

const key = KeyBuilder.create()
  .org('org-123')
  .user('user-456')
  .session('sess-789')
  .cache('preferences')
  .build();

// Result: "org-123:user-456:sess-789:preferences"
```

## API Reference

### `defineBuilder(schema)`

Creates a builder factory from a schema definition.

**Parameters:**
- `schema` (`LevelDef[]`): Array of level definitions

**Returns:** `{ create(): Builder }`

### `LevelDef`

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Method name |
| `params` | `('string' \| 'number' \| 'Date')[]` | Parameter types |
| `parent` | `string \| null` | Parent level ID |
| `id` | `string` (optional) | Unique identifier |
| `format` | `(...args: (string \| number \| Date)[]) => string` (optional) | Custom formatter |

### Builder Methods

Methods are dynamically generated based on your schema. Only valid next methods are available at each step.

- **Level methods**: `(...args)` → Next builder state
- **`.build()`**: Available when chain has at least one level, returns `string`

## License

MIT © Sebastian Weidmann
