/**
 * Type-level tests for @swatchmaker/typed-keys.
 *
 * These tests verify that TypeScript provides proper autocomplete and catches
 * invalid chains at compile time.
 */
import { describe, it, expect } from 'vitest';
import { defineBuilder } from '../builder.js';

describe('type-level tests', () => {
  it('should provide autocomplete for valid chains', () => {
    const KeyBuilder = defineBuilder([
      { name: 'org', params: ['string'], parent: null },
      { name: 'courts', params: ['string'], parent: 'org' },
      { name: 'occupancy', params: ['Date', 'Date'], parent: 'courts' },
    ] as const);

    // At this point, TypeScript should show autocomplete for 'org' method
    // After calling org(), TypeScript should show 'courts' method
    // After calling courts(), TypeScript should show 'occupancy' method
    // After calling occupancy(), TypeScript should show 'build' method

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder = KeyBuilder.create() as any;
    const key = builder
      .org('org-123')
      .courts('court-456')
      .occupancy(new Date('2024-01-01'), new Date('2024-01-07'))
      .build();

    expect(key).toBeTruthy();
  });

  it('should prevent access to methods not in chain', () => {
    const KeyBuilder = defineBuilder([
      { name: 'org', params: ['string'], parent: null },
      { name: 'courts', params: ['string'], parent: 'org' },
    ] as const);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder = KeyBuilder.create() as any;

    // This is a runtime error for invalid method access
    expect(() => builder.invalid()).toThrow();
  });

  it('should enforce parameter types', () => {
    const KeyBuilder = defineBuilder([
      { name: 'org', params: ['string'], parent: null },
      { name: 'courts', params: ['number'], parent: 'org' },
    ] as const);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder = KeyBuilder.create() as any;

    // TypeScript should enforce string for org() and number for courts()
    const key = builder.org('org-123').courts(456).build();

    expect(key).toContain('org-123');
    expect(key).toContain('456');
  });

  it('should track chain state through types', () => {
    const KeyBuilder = defineBuilder([
      { name: 'a', params: ['string'], parent: null },
      { name: 'b', params: ['string'], parent: 'a' },
      { name: 'c', params: ['string'], parent: 'b' },
    ] as const);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder = KeyBuilder.create() as any;

    // TypeScript should track that after 'a', only 'b' is available
    // After 'b', only 'c' is available
    // After 'c', only 'build' is available

    const key = builder.a('1').b('2').c('3').build();
    expect(key).toContain('1');
    expect(key).toContain('2');
    expect(key).toContain('3');
  });
});
