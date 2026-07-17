import { test as setup } from '@playwright/test';
import { runDownloadIar } from './utils/download-iar';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  const skipVSCodeDownload = process.env.RUN_IN_BROWSER ? true : false;
  const skipIarDownload = process.env.SKIP_IAR_DOWNLOAD ? true : false;

  if (!skipVSCodeDownload) {
    await runDownloadAndUnzipVSCode();
  } else {
    console.log('Skipping VSCode download as RUN_IN_BROWSER is set to true');
  }

  if (!skipIarDownload) {
    await runDownloadIar();
  } else {
    console.log('Skipping IAR download as SKIP_IAR_DOWNLOAD is set');
  }
});
