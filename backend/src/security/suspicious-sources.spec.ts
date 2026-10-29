import { describe, expect, it } from 'vitest';
import { getSuspiciousSources } from './suspicious-sources.js';

describe('getSuspiciousSources', () => {
  it('flags sources with at least five failed sign-ins in the window', () => {
    const sources = getSuspiciousSources([
      ...Array.from({ length: 5 }, () => ({ sourceIp: '203.0.113.4' })),
      ...Array.from({ length: 4 }, () => ({ sourceIp: '203.0.113.8' })),
      { sourceIp: null },
    ]);

    expect(sources).toEqual([{ sourceIp: '203.0.113.4', attempts: 5 }]);
  });
});
