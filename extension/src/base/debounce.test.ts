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
  expect(values).toEqual(['project1 deploy executed', 'project2 deploy executed']);
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
  expect(values).toEqual(['Invalidate executed']);
});

test('debounce resets', async () => {
  const values: string[] = [];
  debouncedAction(() => {
    values.push('push1');
  }, 'deploy')();
  debouncedAction(() => {
    values.push('push2');
  }, 'deploy')();
  await vi.advanceTimersByTimeAsync(800);
  debouncedAction(() => {
    values.push('push3');
  }, 'deploy')();
  await vi.advanceTimersByTimeAsync(800);
  expect(values).toEqual([]);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(values).toEqual(['push1']);
});
