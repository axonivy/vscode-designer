import { test as setup } from '@playwright/test';
import { resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { execSync } from 'child_process';
import path from 'path';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  const skipVSCodeDownload = process.env.RUN_IN_BROWSER ? true : false;
  if (!skipVSCodeDownload) {
    const vscodePath = await runDownloadAndUnzipVSCode();
    const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);
    const extensionDir = path.resolve(process.cwd(), 'test-extension-dir');
    execSync(
      `"${cliPath}" --install-extension vscjava.vscode-java-pack --install-extension axonivy.vscode-designer-14 --extensions-dir ${extensionDir}`
    );
  } else {
    console.log('Skipping VSCode download as RUN_IN_BROWSER is set to true');
  }
});
