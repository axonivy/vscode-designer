import path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Uri, type TerminalShellExecutionEndEvent } from 'vscode';
import { DependencySourceDownloader, registerDownloadSourcesHandler } from './download-sources';

const mocks = vi.hoisted(() => ({
  commands: vi.fn(),
  registerCommand: vi.fn(),
  projects: vi.fn(),
  selectProject: vi.fn(),
  stat: vi.fn(),
  switchMode: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  start: vi.fn(),
  end: vi.fn(),
  close: vi.fn(),
  dispose: vi.fn(),
  workspace: { isTrusted: true }
}));

vi.mock('vscode', () => {
  class Uri {
    readonly scheme = 'file';
    constructor(readonly fsPath: string) {}
    static file(filePath: string) { return new Uri(filePath); }
  }
  return {
    Uri,
    commands: { executeCommand: mocks.commands },
    l10n: {
      t: (message: string, ...args: unknown[]) =>
        args.reduce<string>((result, arg, index) => result.replace(`{${index}}`, String(arg)), message)
    },
    workspace: Object.assign(mocks.workspace, { fs: { stat: mocks.stat } }),
    window: {
      onDidStartTerminalShellExecution: mocks.start,
      onDidEndTerminalShellExecution: mocks.end,
      onDidCloseTerminal: mocks.close
    }
  };
});
vi.mock('../base/commands', () => ({ registerCommand: mocks.registerCommand }));
vi.mock('../base/ivyProjectSelection', () => ({ selectIvyProjectDialog: mocks.selectProject }));
vi.mock('../base/java-extension-api', () => ({ runJavaServerModeSwitch: mocks.switchMode }));
vi.mock('../base/logging-util', () => ({
  logInformationMessage: mocks.info,
  logWarningMessage: mocks.warning,
  logErrorMessage: mocks.error
}));
vi.mock('../project-explorer/ivy-project-manager', () => ({
  IvyProjectManager: { instance: { getIvyProjects: mocks.projects } }
}));

const project = path.resolve('/workspace/project');
const otherProject = path.resolve('/workspace/other');
const pom = () => Uri.file(path.join(project, 'pom.xml'));
let downloader: DependencySourceDownloader;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.workspace.isTrusted = true;
  mocks.projects.mockResolvedValue([project, otherProject]);
  mocks.selectProject.mockResolvedValue(undefined);
  mocks.stat.mockResolvedValue({});
  mocks.commands.mockResolvedValue(undefined);
  mocks.switchMode.mockResolvedValue(undefined);
  // Notification buttons resolve only when the simulated user selects one.
  mocks.info.mockImplementation(() => new Promise(() => { /* Notification is still open. */ }));
  for (const event of [mocks.start, mocks.end, mocks.close]) {
    event.mockReturnValue({ dispose: mocks.dispose });
  }
  downloader = new DependencySourceDownloader();
});

afterEach(() => downloader.dispose());

const commandLine = (callIndex = 0) => {
  const [, pomPath, goal] = mocks.commands.mock.calls.filter(call => call[0] === 'maven.goal.custom')[callIndex] ?? [];
  return `mvn ${goal} -f "${pomPath}"`;
};
const emitEnd = (exitCode: number | undefined, line = commandLine()) => {
  const event = { execution: { commandLine: { value: line } }, terminal: {}, exitCode } as TerminalShellExecutionEndEvent;
  const handler = mocks.end.mock.calls[0]?.[0] as (event: TerminalShellExecutionEndEvent) => void;
  handler(event);
};
const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); } };
const javaRefreshes = () => mocks.commands.mock.calls.filter(call => call[0] === 'java.projectConfiguration.update');

test('registers an optional command and disposes event listeners with the extension', () => {
  const context = { subscriptions: [] };
  registerDownloadSourcesHandler(context as never);
  expect(mocks.registerCommand).toHaveBeenCalledWith('ivyProjects.downloadDependencySources', context, expect.any(Function));
  (context.subscriptions[0] as unknown as DependencySourceDownloader).dispose();
  expect(mocks.dispose).toHaveBeenCalledTimes(3);
});

test('launches Maven for a resource selected inside the project without -U or a Java cache reload', async () => {
  await downloader.download(Uri.file(path.join(project, 'process', 'test.p.json')));
  expect(mocks.commands).toHaveBeenCalledWith('maven.goal.custom', pom().fsPath, expect.stringMatching(/^dependency:sources "-Divy\.sources\.download=[\da-f-]+"$/));
  expect(mocks.commands.mock.calls[0]?.[2]).not.toContain('-U');
  expect(javaRefreshes()).toEqual([]);
  expect(mocks.switchMode).not.toHaveBeenCalled();
  expect(mocks.selectProject).not.toHaveBeenCalled();
});

test('quotes the complete dotted Maven property argument for Windows PowerShell', async () => {
  await downloader.download(Uri.file(project));
  const goal = mocks.commands.mock.calls[0]?.[2] as string;
  expect(goal.split(' ')).toEqual(['dependency:sources', expect.stringMatching(/^"-Divy\.sources\.download=[\da-f-]+"$/)]);
  emitEnd(0, `& mvn ${goal} -f "C:\\Users\\Developer\\Ivy Project\\pom.xml"`);
  await flush();
  expect(javaRefreshes()).toEqual([['java.projectConfiguration.update', pom()]]);
});

test('accepts an Ivy project explorer entry', async () => {
  await downloader.download({ uri: Uri.file(project) } as never);
  expect(mocks.commands.mock.calls[0]?.[1]).toBe(pom().fsPath);
});

test('asks for a project when no project is explicitly selected', async () => {
  mocks.selectProject.mockResolvedValue(Uri.file(project));
  await downloader.download();
  expect(mocks.selectProject).toHaveBeenCalledOnce();
  expect(mocks.commands.mock.calls[0]?.[1]).toBe(pom().fsPath);
});

test('does not launch when project selection is cancelled', async () => {
  await downloader.download();
  expect(mocks.commands).not.toHaveBeenCalled();
});

test('launches for an explicitly selected nested Ivy project', async () => {
  const nested = path.join(project, 'nested');
  mocks.projects.mockResolvedValue([project, nested]);
  await downloader.download(Uri.file(nested));
  expect(mocks.commands.mock.calls[0]?.[1]).toBe(path.join(nested, 'pom.xml'));
});

test('asks the user to select a project when the explicit selection is not an Ivy project', async () => {
  mocks.selectProject.mockResolvedValue(Uri.file(project));
  await downloader.download(Uri.file(`${project}-suffix/file.java`));
  expect(mocks.selectProject).toHaveBeenCalledOnce();
  expect(mocks.commands.mock.calls[0]?.[1]).toBe(pom().fsPath);
});

test('does not launch in an untrusted workspace', async () => {
  mocks.workspace.isTrusted = false;
  await downloader.download(Uri.file(project));
  expect(mocks.commands).not.toHaveBeenCalled();
  expect(mocks.warning).toHaveBeenCalledOnce();
});

test('reports a missing POM and does not launch Maven', async () => {
  mocks.stat.mockRejectedValue(new Error('FileNotFound'));
  await downloader.download(Uri.file(project));
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('No pom.xml'));
  expect(mocks.commands).not.toHaveBeenCalled();
});

test('refreshes only the owning project after a successful Maven exit', async () => {
  await downloader.download(Uri.file(project));
  emitEnd(0);
  await flush();
  expect(mocks.switchMode).toHaveBeenCalledOnce();
  expect(javaRefreshes()).toEqual([['java.projectConfiguration.update', pom()]]);
  expect(mocks.commands.mock.calls.some(call => call[0] === 'java.clean.workspace' || call[0] === 'workbench.action.reloadWindow')).toBe(false);
  emitEnd(0);
  await flush();
  expect(javaRefreshes()).toHaveLength(1);
});

test.each([1, 130])('does not refresh after Maven fails or is interrupted (exit %s)', async exitCode => {
  await downloader.download(Uri.file(project));
  emitEnd(exitCode);
  await flush();
  expect(javaRefreshes()).toEqual([]);
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining(`exit code ${exitCode}`));
  await downloader.download(Uri.file(project));
  expect(mocks.commands).toHaveBeenCalledTimes(2);
});

test('does not treat an unknown exit code as success', async () => {
  await downloader.download(Uri.file(project));
  emitEnd(undefined);
  await flush();
  expect(javaRefreshes()).toEqual([]);
  expect(mocks.info).toHaveBeenCalledTimes(2);
});

test('ignores unrelated terminal commands and truncated correlation tokens', async () => {
  await downloader.download(Uri.file(project));
  emitEnd(0, 'mvn dependency:sources -f "/some/other/pom.xml"');
  emitEnd(0, commandLine().replace('" -f', 'extra" -f'));
  await flush();
  expect(javaRefreshes()).toEqual([]);
});

test('correlates concurrent downloads even with quoted Windows command lines', async () => {
  await downloader.download(Uri.file(project));
  await downloader.download(Uri.file(otherProject));
  const goal = mocks.commands.mock.calls.filter(call => call[0] === 'maven.goal.custom')[1]?.[2] as string;
  emitEnd(0, `& "C:\\Maven\\bin\\mvn.cmd" ${goal} -f "D:\\Workspace\\other\\pom.xml"`);
  await flush();
  expect(javaRefreshes()).toEqual([['java.projectConfiguration.update', Uri.file(path.join(otherProject, 'pom.xml'))]]);
  emitEnd(0, commandLine(0));
  await flush();
  expect(javaRefreshes()).toHaveLength(2);
});

test('does not launch duplicate downloads for a project', async () => {
  await downloader.download(Uri.file(project));
  await downloader.download(Uri.file(project));
  expect(mocks.commands).toHaveBeenCalledOnce();
});

test('offers a manual project refresh for terminals without shell integration', async () => {
  mocks.info.mockResolvedValueOnce('Maven finished: Refresh Java');
  await downloader.download(Uri.file(project));
  await flush();
  expect(javaRefreshes()).toEqual([['java.projectConfiguration.update', pom()]]);
});

test('stop tracking does not terminate Maven or refresh Java and permits another attempt', async () => {
  mocks.info.mockResolvedValueOnce('Stop tracking');
  await downloader.download(Uri.file(project));
  await flush();
  emitEnd(0);
  await flush();
  expect(javaRefreshes()).toEqual([]);
  await downloader.download(Uri.file(project));
  expect(mocks.commands).toHaveBeenCalledTimes(2);
});

test('reports launch failure and releases the project for retry', async () => {
  mocks.commands.mockRejectedValueOnce(new Error('Maven extension unavailable'));
  await downloader.download(Uri.file(project));
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Maven extension unavailable'));
  await downloader.download(Uri.file(project));
  expect(mocks.commands).toHaveBeenCalledTimes(2);
});

test('reports Java refresh failure without cleaning or restarting Java', async () => {
  await downloader.download(Uri.file(project));
  mocks.commands.mockRejectedValueOnce(new Error('Java extension unavailable'));
  emitEnd(0);
  await flush();
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Could not refresh Java'));
});

test('closing the tracked terminal releases the project without refreshing Java', async () => {
  await downloader.download(Uri.file(project));
  const terminal = {};
  const start = mocks.start.mock.calls[0]?.[0] as (event: unknown) => void;
  start({ execution: { commandLine: { value: commandLine() } }, terminal });
  const close = mocks.close.mock.calls[0]?.[0] as (terminal: unknown) => void;
  close(terminal);
  emitEnd(0);
  await flush();
  expect(javaRefreshes()).toEqual([]);
  await downloader.download(Uri.file(project));
  expect(mocks.commands).toHaveBeenCalledTimes(2);
});

test('disposal ignores late terminal events and notification actions', async () => {
  let choose: (choice: string) => void = () => { /* Not assigned yet. */ };
  mocks.info.mockImplementationOnce(() => new Promise<string>(resolve => { choose = resolve; }));
  await downloader.download(Uri.file(project));
  downloader.dispose();
  emitEnd(0);
  choose('Maven finished: Refresh Java');
  await flush();
  expect(javaRefreshes()).toEqual([]);
});
