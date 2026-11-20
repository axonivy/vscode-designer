import { expect, test } from 'vitest';
import { createNonce } from './nonce-util';

test('creates a fresh CSP-compatible nonce', () => {
  const first = createNonce();
  const second = createNonce();

  expect(first).toMatch(/^[a-f0-9]{32}$/);
  expect(second).toMatch(/^[a-f0-9]{32}$/);
  expect(second).not.toBe(first);
});
