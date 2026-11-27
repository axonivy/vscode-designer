import { test as setup } from '@playwright/test';
import { resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { exec, execFileSync, type ExecException } from 'child_process';
import { promisify } from 'node:util';
import path from 'path';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

const execAsync = promisify(exec);
const PATH_PREBUILT_PROJECT = path.resolve(import.meta.dirname, 'workspaces/prebuiltProject');

const isExecException = (error: unknown): error is ExecException => error instanceof Error && 'stdout' in error && 'stderr' in error;

const buildPrebuiltProject = async () => {
  const mvnCommand = `mvn -ntp -f "${PATH_PREBUILT_PROJECT}/pom.xml" clean package`;
  let stdout: string;
  try {
    ({ stdout } = await execAsync(mvnCommand, {
      encoding: 'utf8',
      windowsHide: true
    }));
  } catch (error) {
    console.error(`Error executing command: ${mvnCommand}`);
    if (isExecException(error)) {
      if (error.stdout !== undefined) {
        console.error(error.stdout);
      }
      if (error.stderr !== undefined) {
        console.error(error.stderr);
      }
    }
    throw error;
  }
  if (!stdout.includes('BUILD SUCCESS')) {
    throw new Error(`Maven build did not report "BUILD SUCCESS". Output:\n\n${stdout}`);
  }
  console.log('Maven build of prebuiltProject succeeded');
};

setup('Setup', async ({}) => {
  setup.setTimeout(60 * 1000); // 1 minute

  // Only build the prebuilt project if running locally
  if (process.env.CI !== 'true') {
    await buildPrebuiltProject();
  }

  const skipVSCodeDownload = process.env.RUN_IN_BROWSER ? true : false;
  if (!skipVSCodeDownload) {
    const vscodePath = await runDownloadAndUnzipVSCode();
    const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
    if (!cliPath) {
      throw new Error('Unable to resolve VS Code CLI path');
    }
    const extensionDir = path.resolve(process.cwd(), 'test-extension-dir');
    const args = [
      '--install-extension',
      'vscjava.vscode-java-pack',
      '--install-extension',
      'axonivy.vscode-designer-14',
      '--extensions-dir',
      extensionDir
    ];
    const isWindows = process.platform === 'win32';
    execFileSync(cliPath, isWindows ? args.map(arg => `"${arg}"`) : args, {
      shell: isWindows
    });
  } else {
    console.log('Skipping VSCode download as RUN_IN_BROWSER is set to true');
  }
});
