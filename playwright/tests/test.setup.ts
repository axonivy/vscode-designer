import { test as setup } from '@playwright/test';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  const skipVSCodeDownload = process.env.RUN_IN_BROWSER ? true : false;
  if (!skipVSCodeDownload) {
    await runDownloadAndUnzipVSCode();
  } else {
    console.log('Skipping VSCode download as RUN_IN_BROWSER is set to true');
  }
});
