import { beforeEach, describe, expect, test, vi } from 'vitest';
import { workspace } from 'vscode';
import { checkSettings } from './check-settings';
import { logWarningMessage } from './logging-util';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn()
  }
}));

vi.mock('./logging-util', () => ({
  logWarningMessage: vi.fn()
}));

const getMock = vi.fn();

describe("Test 'java.import.maven.enabled'", () => {
  beforeEach(() => {
    getMock.mockReset().mockReturnValue(undefined);
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: getMock } as never);
    vi.mocked(logWarningMessage).mockReset();
  });

  test.each([undefined, true])('does not warn when the setting is %s', value => {
    getMock.mockReturnValue(value);

    checkSettings();

    expect(logWarningMessage).not.toHaveBeenCalled();
  });

  test.each([false, 'true', 1])('warns when the setting is overridden with %s', value => {
    getMock.mockReturnValue(value);

    checkSettings();

    expect(logWarningMessage).toHaveBeenCalledOnce();
    expect(logWarningMessage).toHaveBeenCalledWith(expect.stringContaining('java.import.maven.enabled'));
  });
});
