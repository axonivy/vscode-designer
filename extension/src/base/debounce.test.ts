import { expect, test, vi } from 'vitest';
import { debouncedAction, hasDeployActionInQueue } from './debounce';

test.beforeAll(() => {
  vi.useFakeTimers();
});

test.afterAll(() => {
  vi.useRealTimers();
});

test('debounce deploy', async () => {
  const values: string[] = [];
  debouncedAction(
    () => {
      values.push('project1 deploy executed');
    },
    'deploy',
    'project1'
  )();
  debouncedAction(
    () => {
      values.push('Other executed');
    },
    'deploy',
    'project1'
  )();
  debouncedAction(
    () => {
      values.push('project2 deploy executed');
    },
    'deploy',
    'project2'
  )();
  expect(values).toEqual([]);
  expect(hasDeployActionInQueue()).toBe(true);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(values.length).toBe(2);
  expect(values).toContain('project1 deploy executed');
  expect(values).toContain('project2 deploy executed');
});

test('debounce invalidate', async () => {
  const values: string[] = [];
  debouncedAction(
    () => {
      values.push('Invalidate executed');
    },
    'invalidate',
    'test'
  )();
  debouncedAction(
    () => {
      values.push('Other executed');
    },
    'invalidate',
    'test'
  )();
  expect(values).toEqual([]);
  expect(hasDeployActionInQueue()).toBe(false);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(values).toContain('Invalidate executed');
});
