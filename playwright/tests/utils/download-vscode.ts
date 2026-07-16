import { downloadAndUnzipVSCode, type DownloadOptions } from '@vscode/test-electron';

const downloadVersion: DownloadOptions['version'] = process.env.RUN_STABLE_VERSION === 'true' ? 'stable' : 'insiders';

export const runDownloadAndUnzipVSCode = async () => {
  console.log('runDownloadAndUnzipVSCode : All process.env:', process.env);
  console.log('runDownloadAndUnzipVSCode : All process.argv:', process.argv);

  await downloadAndUnzipVSCode({ version: downloadVersion });
};
