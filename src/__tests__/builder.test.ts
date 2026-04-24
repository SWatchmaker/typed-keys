import { describe, it, expect } from 'vitest';
import { defineBuilder } from '../builder.js';

describe('@swatchmaker/typed-keys with IDs', () => {
  describe('basic functionality', () => {
    it('should build a simple key with one level', () => {
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).org('org-123').build();
      expect(key).toBe('org-123');
    });

    it('should build a chained key with multiple levels', () => {
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
        { name: 'courts', params: ['string'], parent: 'org' },
        { name: 'occupancy', params: ['Date', 'Date'], parent: 'courts' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = KeyBuilder.create() as any;
      const key = builder
        .org('org-123')
        .courts('court-456')
        .occupancy(new Date('2024-01-01'), new Date('2024-01-07'))
        .build();

      expect(key).toContain('org-123');
      expect(key).toContain('court-456');
      expect(key).toContain('2024-01-01');
    });

    it('should support custom IDs', () => {
      const KeyBuilder = defineBuilder([
        { id: 'root', name: 'org', params: ['string'], parent: null },
        { id: 'court-level', name: 'courts', params: ['string'], parent: 'root' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).org('org-123').courts('court-456').build();
      expect(key).toContain('org-123');
      expect(key).toContain('court-456');
    });
  });

  describe('duplicate ID detection', () => {
    it('should throw when duplicate IDs are detected (same name)', () => {
      expect(() => {
        defineBuilder([
          { name: 'org', params: ['string'], parent: null },
          { name: 'courts', params: ['string'], parent: 'org' },
          { name: 'courts', params: ['number'], parent: 'org' }, // Duplicate ID!
        ] as const);
      }).toThrow(/Duplicate level IDs found: courts/);
    });

    it('should throw when explicit IDs are duplicates', () => {
      expect(() => {
        defineBuilder([
          { id: 'same-id', name: 'level1', params: ['string'], parent: null },
          { id: 'same-id', name: 'level2', params: ['string'], parent: 'same-id' },
        ] as const);
      }).toThrow(/Duplicate level IDs found: same-id/);
    });

    it('should work with distinct IDs for same name', () => {
      // This should work because IDs are distinct
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
        { id: 'court-string', name: 'courts', params: ['string'], parent: 'org' },
        { id: 'court-number', name: 'courts', params: ['number'], parent: 'org' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = KeyBuilder.create() as any;
      const key1 = builder.org('org-123').courts('court-a').build();
      const key2 = builder.org('org-456').courts(789).build();

      expect(key1).toContain('org-123');
      expect(key1).toContain('court-a');
      expect(key2).toContain('org-456');
      expect(key2).toContain('789');
    });

    it('should include helpful error message for duplicate IDs', () => {
      try {
        defineBuilder([
          { name: 'org', params: ['string'], parent: null },
          { name: 'courts', params: ['string'], parent: 'org' },
          { name: 'courts', params: ['number'], parent: 'org' },
        ] as const);
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Duplicate level IDs found: courts');
        expect(message).toContain('you must provide distinct');
        expect(message).toContain("'id'");
      }
    });
  });

  describe('parent reference by ID', () => {
    it('should reference parent by ID when custom ID is used', () => {
      const KeyBuilder = defineBuilder([
        { id: 'root-org', name: 'org', params: ['string'], parent: null },
        { id: 'court-level', name: 'courts', params: ['string'], parent: 'root-org' },
        { id: 'occ-level', name: 'occupancy', params: ['Date'], parent: 'court-level' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any)
        .org('org-123')
        .courts('court-456')
        .occupancy(new Date('2024-01-01'))
        .build();

      expect(key).toContain('org-123');
      expect(key).toContain('court-456');
    });

    it('should throw when parent references unknown ID', () => {
      expect(() => {
        defineBuilder([
          { name: 'org', params: ['string'], parent: null },
          { name: 'courts', params: ['string'], parent: 'nonexistent-id' },
        ] as const);
      }).toThrow(/references unknown parent 'nonexistent-id'/);
    });
  });

  describe('type casting', () => {
    it('should cast numbers to strings', () => {
      const KeyBuilder = defineBuilder([
        { name: 'id', params: ['number'], parent: null },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).id(42).build();
      expect(key).toBe('42');
    });

    it('should cast dates to ISO strings', () => {
      const KeyBuilder = defineBuilder([
        { name: 'date', params: ['Date'], parent: null },
      ] as const);

      const date = new Date('2024-01-01');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).date(date).build();
      expect(key).toBe(date.toISOString());
    });
  });

  describe('custom formatters', () => {
    it('should use custom formatter when provided', () => {
      const KeyBuilder = defineBuilder([
        {
          name: 'custom',
          params: ['string', 'number'],
          parent: null,
          format: (str, num) => `prefix-${str}-suffix-${num}`,
        },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).custom('test', 42).build();
      expect(key).toBe('prefix-test-suffix-42');
    });
  });

  describe('reusable partial builders', () => {
    it('should allow reusing base builder', () => {
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
        { name: 'courts', params: ['string'], parent: 'org' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base = KeyBuilder.create() as any;
      const org1 = base.org('org-123');
      const org2 = base.org('org-456');

      const key1 = org1.courts('court-a').build();
      const key2 = org1.courts('court-b').build();
      const key3 = org2.courts('court-c').build();

      expect(key1).toContain('org-123');
      expect(key1).toContain('court-a');
      expect(key2).toContain('org-123');
      expect(key2).toContain('court-b');
      expect(key3).toContain('org-456');
      expect(key3).toContain('court-c');
    });
  });

  describe('validation', () => {
    it('should throw on too many levels', () => {
      expect(() => {
        defineBuilder([
          { name: 'a', params: ['string'], parent: null },
          { name: 'b', params: ['string'], parent: 'a' },
          { name: 'c', params: ['string'], parent: 'b' },
          { name: 'd', params: ['string'], parent: 'c' },
          { name: 'e', params: ['string'], parent: 'd' },
          { name: 'f', params: ['string'], parent: 'e' },
          { name: 'g', params: ['string'], parent: 'f' },
          { name: 'h', params: ['string'], parent: 'g' },
          { name: 'i', params: ['string'], parent: 'h' },
          { name: 'j', params: ['string'], parent: 'i' },
          { name: 'k', params: ['string'], parent: 'j' },
        ] as const);
      }).toThrow('maximum is 10');
    });

    it('should not allow build on empty chain', () => {
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
      ] as const);

      const builder = KeyBuilder.create();
      expect((builder as { build?(): string }).build).toBeUndefined();
    });

    it('should throw on invalid method at runtime', () => {
      const KeyBuilder = defineBuilder([
        { name: 'org', params: ['string'], parent: null },
        { name: 'courts', params: ['string'], parent: 'org' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base = KeyBuilder.create() as any;

      expect(() => {
        base.courts('invalid');
      }).toThrow("Method 'courts' is not available");
    });
  });

  describe('levels with no parameters (domain separators)', () => {
    it('should use level name as key segment when params is empty', () => {
      const KeyBuilder = defineBuilder([
        { name: 'bready', params: [], parent: null },
        { name: 'org', params: ['string'], parent: 'bready' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).bready().org('org-123').build();
      expect(key).toBe('bready:org-123');
    });

    it('should support no-param levels with parents', () => {
      const KeyBuilder = defineBuilder([
        { name: 'app', params: [], parent: null },
        { name: 'service', params: [], parent: 'app' },
        { name: 'org', params: ['string'], parent: 'service' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).app().service().org('org-789').build();
      expect(key).toBe('app:service:org-789');
    });

    it('should allow custom format to override level name', () => {
      const KeyBuilder = defineBuilder([
        {
          name: 'domain',
          params: [],
          parent: null,
          format: () => 'custom-domain',
        },
        { name: 'org', params: ['string'], parent: 'domain' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any).domain().org('org-999').build();
      expect(key).toBe('custom-domain:org-999');
    });

    it('should mix no-param and with-param levels', () => {
      const KeyBuilder = defineBuilder([
        { name: 'prefix', params: [], parent: null },
        { name: 'org', params: ['string'], parent: 'prefix' },
        { name: 'separator', params: [], parent: 'org' },
        { name: 'id', params: ['number'], parent: 'separator' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any)
        .prefix()
        .org('org-111')
        .separator()
        .id(42)
        .build();
      expect(key).toBe('prefix:org-111:separator:42');
    });
  });

  describe('complex examples', () => {
    it('should handle user-session-cache chain', () => {
      const KeyBuilder = defineBuilder([
        { name: 'user', params: ['string'], parent: null },
        { name: 'session', params: ['string'], parent: 'user' },
        { name: 'cache', params: ['string'], parent: 'session' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any)
        .user('user-123')
        .session('sess-456')
        .cache('preferences')
        .build();

      expect(key).toContain('user-123');
      expect(key).toContain('sess-456');
      expect(key).toContain('preferences');
    });

    it('should handle deeply nested chains with custom IDs', () => {
      const KeyBuilder = defineBuilder([
        { id: 'level-a', name: 'a', params: ['string'], parent: null },
        { id: 'level-b', name: 'b', params: ['string'], parent: 'level-a' },
        { id: 'level-c', name: 'c', params: ['string'], parent: 'level-b' },
        { id: 'level-d', name: 'd', params: ['string'], parent: 'level-c' },
        { id: 'level-e', name: 'e', params: ['string'], parent: 'level-d' },
      ] as const);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = (KeyBuilder.create() as any)
        .a('1')
        .b('2')
        .c('3')
        .d('4')
        .e('5')
        .build();

      expect(key).toContain('1');
      expect(key).toContain('2');
      expect(key).toContain('3');
      expect(key).toContain('4');
      expect(key).toContain('5');
    });
  });
});
