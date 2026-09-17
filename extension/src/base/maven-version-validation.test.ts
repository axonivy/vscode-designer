/* eslint-disable no-empty-pattern */
import fs from 'fs';
import path from 'path';
import { test as baseTest, beforeEach, expect, vi } from 'vitest';
import { validateMavenExecutable } from './maven-version-validation';

const test = baseTest.extend('executableFixtures', { scope: 'file' }, async ({}, { onCleanup }) => {
  const directory = path.join(__dirname, 'maven-version-validation-test');
  const executableFile = path.join(directory, 'executable');
  const nonExecutableFile = path.join(directory, 'non-executable');

  fs.mkdirSync(directory, { recursive: true });

  fs.writeFileSync(executableFile, 'test');
  fs.writeFileSync(nonExecutableFile, 'test');

  fs.chmodSync(executableFile, 0o755);
  fs.chmodSync(nonExecutableFile, 0o644);

  onCleanup(async () => {
    fs.rmSync(executableFile, { force: true });
    fs.rmSync(nonExecutableFile, { force: true });
  });

  return {
    executableFile,
    nonExecutableFile
  };
});

const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  showInformationMessage: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    }),
    showInformationMessage: mocks.showInformationMessage
  },
  workspace: {
    getConfiguration: () => ({
      inspect: mocks.inspect
    })
  }
}));

vi.mock('child_process', () => ({
  execFileSync: mocks.execFileSync
}));

const VALID_MAVEN_VERSION_OUTPUT = 'Apache Maven 3.9.11';
const INVALID_MAVEN_VERSION_OUTPUT = 'Apache Maven 3.8.5';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inspect.mockImplementation((setting: string) => {
    expect(setting).toBe('executable.path');
    return { workspaceValue: undefined, globalValue: undefined };
  });
  mocks.execFileSync.mockReturnValue(VALID_MAVEN_VERSION_OUTPUT);
});

test('valid Workspace override', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: executableFixtures.executableFile, globalValue: undefined });
  expect(validateMavenExecutable()).toBeUndefined();
});

test('valid Workspace override beats invalid User override', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: executableFixtures.executableFile, globalValue: executableFixtures.nonExecutableFile });
  expect(validateMavenExecutable()).toBeUndefined();
});

test('valid User override ', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: executableFixtures.executableFile });
  expect(validateMavenExecutable()).toBeUndefined();
});

test('invalid Workspace override beats valid User override', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: executableFixtures.nonExecutableFile, globalValue: executableFixtures.executableFile });
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid override not executable', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: executableFixtures.nonExecutableFile, globalValue: undefined });
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid override wrong version', async ({ executableFixtures }) => {
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  mocks.inspect.mockReturnValue({ workspaceValue: executableFixtures.nonExecutableFile, globalValue: undefined });
  expect(() => validateMavenExecutable()).toThrow('Invalid Workspace Maven executable setting');
});

test('invalid User override not executable', async ({ executableFixtures }) => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: executableFixtures.nonExecutableFile });
  expect(() => validateMavenExecutable()).toThrow('Invalid User Maven executable setting');
});

test('valid Maven from PATH', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  expect(validateMavenExecutable()).toBeUndefined();
});

test('invalid no Maven found neither PATH nor settings', async () => {
  mocks.inspect.mockReturnValue({ workspaceValue: undefined, globalValue: undefined });
  mocks.execFileSync.mockReturnValue(INVALID_MAVEN_VERSION_OUTPUT);
  expect(() => validateMavenExecutable()).toThrow('No valid Maven executable found');
});
