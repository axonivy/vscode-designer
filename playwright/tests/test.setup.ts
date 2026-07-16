import { test as setup } from '@playwright/test';
import { runDownloadIar } from './utils/download-iar';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

setup('Setup', async ({}) => {
  console.log('Starting setup...');
  await runDownloadAndUnzipVSCode();
  await runDownloadIar();
  console.log('Setup completed.');
});
