import { runDownloadIar } from './utils/download-iar';
import { runDownloadAndUnzipVSCode } from './utils/download-vscode';

const runSetup = async () => {
  console.log('Starting setup...');
  await runDownloadAndUnzipVSCode();
  await runDownloadIar();
  console.log('Setup completed.');
};

runSetup();
