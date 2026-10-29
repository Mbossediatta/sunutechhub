import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { classifyEvent, maskAccount } from './security-events.middleware.js';

function createRequest(path: string, body: unknown) {
  return {
    path: '/api/projects/public',
    originalUrl: path,
    method: 'POST',
    body,
  } as Request;
}

describe('security event detection', () => {
  it.each([
    ["' OR 1=1", 'SQL_INJECTION_PROBE'],
    ['UNION SELECT password FROM users', 'SQL_INJECTION_PROBE'],
    ['DROP TABLE users', 'SQL_INJECTION_PROBE'],
    ['<script>alert(1)</script>', 'XSS_PROBE'],
    ['../../private', 'PATH_TRAVERSAL_PROBE'],
  ])('classifies a %s probe without storing its payload', (payload, reason) => {
    const event = classifyEvent(
      createRequest('/api/search', { query: payload }),
      400,
    );
    expect(event).toMatchObject({
      eventType: 'SUSPICIOUS_REQUEST',
      severity: 'HIGH',
      reason,
    });
    expect(event).not.toHaveProperty('payload');
  });

  it('masks account identifiers before storing failed login events', () => {
    expect(maskAccount('Member@example.com')).toBe('m***@example.com');
    expect(maskAccount(undefined)).toBeNull();
  });
});
