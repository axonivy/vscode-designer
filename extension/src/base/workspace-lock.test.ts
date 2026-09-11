import { expect, test, vi } from 'vitest';
import { decreaseWorkspaceLock, increaseWorkspaceLock, isWorkspaceLocked } from './workspace-lock';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      appendLine: vi.fn()
    })
  }
}));

test('workspace lock', async () => {
  expect(isWorkspaceLocked()).toBe(true);
  decreaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(false);
  decreaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(false);

  increaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(true);
  increaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(true);

  decreaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(true);
  decreaseWorkspaceLock();
  expect(isWorkspaceLocked()).toBe(false);
});
