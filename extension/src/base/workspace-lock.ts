import { extensionLogOutputChannel } from './extension-output-channel';

let lockCount = 1; // make sure workspace is initially locked, will be unlocked if engine is available

export const increaseWorkspaceLock = () => {
  if (lockCount < 0) {
    extensionLogOutputChannel.appendLine(`Workspace lock underflow, current count: ${lockCount}`);
    lockCount = 0;
  }
  lockCount++;
  extensionLogOutputChannel.appendLine(`Workspace lock incremented, current count: ${lockCount}`);
};

export const decreaseWorkspaceLock = () => {
  if (lockCount <= 0) {
    extensionLogOutputChannel.appendLine(`Workspace lock underflow, current count: ${lockCount}`);
    lockCount = 0;
    return;
  }
  lockCount--;
  extensionLogOutputChannel.appendLine(`Workspace lock decremented, current count: ${lockCount}`);
};

export const isWorkspaceLocked = () => {
  const isLocked = lockCount > 0;
  extensionLogOutputChannel.appendLine(`Workspace lock status checked, current count: ${lockCount}, is locked: ${isLocked}`);
  return isLocked;
};
