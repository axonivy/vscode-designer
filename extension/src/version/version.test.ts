import { expect, test } from 'vitest';
import { toVersion } from './version';

test('parses version', () => {
  expect(toVersion('13.2.3')).toEqual({ major: 13, minor: 2, patch: 3, rawVersion: '13.2.3' });
});

test('parses version with extra parts', () => {
  expect(toVersion('1.2.3.4.5')).toEqual({ major: 1, minor: 2, patch: 3, rawVersion: '1.2.3.4.5' });
});

test('throws error for version with less than 3 parts', () => {
  expect(() => toVersion('1.2')).toThrow('Invalid version 1.2');
});

test('throws error for empty string', () => {
  expect(() => toVersion('')).toThrow('Invalid version ');
});

test('throws error for non-numeric major version', () => {
  expect(() => toVersion('a.2.3')).toThrow('Invalid version part a in version a.2.3');
});
