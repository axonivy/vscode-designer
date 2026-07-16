import { test as setup } from '@playwright/test';
import { runDownloadIar } from './utils/download-iar';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  console.log('test.setup.ts: process.argv: ' + process.argv.join('\n'));
  console.log('test.setup.ts: process.env: ' + JSON.stringify(process.env, null, 2));

  const skipIarDownload = process.env.SKIP_IAR_DOWNLOAD ? true : false;
  await runDownloadAndUnzipVSCode();
  if (!skipIarDownload) {
    await runDownloadIar();
  } else {
    console.log('Skipping IAR download as SKIP_IAR_DOWNLOAD is set');
  }
});
