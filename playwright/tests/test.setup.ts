import { test as setup } from '@playwright/test';
import { runDownloadIar } from './utils/download-iar';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  console.log('Starting setup...');

  console.log('All process.env:', process.env);
  console.log('All process.argv:', process.argv);

  const skipIarDownload = process.env.SKIP_IAR_DOWNLOAD ? true : false;

  await runDownloadAndUnzipVSCode();
  if (!skipIarDownload) {
    await runDownloadIar();
  }
  console.log('Setup completed.');
});
